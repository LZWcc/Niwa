// 自动获取网站图标。同时从几个来源取，取到的都作为候选（对话框里可以挑）：
// - 网站自己声明的（apple-touch-icon、manifest 里的大图）：最清晰，也不经过第三方；但不少网站的首页是反爬页，读不到。
// - 第三方图标服务（config.ts 的 ICONS.sources）：免费服务可能限流、停掉或在某些网络下连不上，所以配了几个、互不影响。
// 取到的图都统一成 128px（image.ts）存在本地，之后显示不再联网。
import { ICONS, type IconSource } from '../../config';
import { toIconImage } from './image';

/** 获取图标要访问任意网站：网站自己的页面和图片，以及各个图标服务。 */
export const ICON_ORIGINS = ['https://*/*'];

const sha256 = async (blob: Blob) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))].map((b) => b.toString(16).padStart(2, '0')).join('');

/** 是不是这个服务“查不到”时返回的占位图（识别规则见 config.ts 里的 placeholder） */
async function isPlaceholder(response: Response, blob: Blob, placeholder: IconSource['placeholder']) {
  if (!placeholder) return false;
  if ('cacheControl' in placeholder) return placeholder.cacheControl.test(response.headers.get('cache-control') ?? '');
  return (await sha256(blob)) === placeholder.sha256;
}

const get = (url: string) =>
  fetch(url, { signal: AbortSignal.timeout(ICONS.timeout) }).then((r) =>
    r.ok ? r : Promise.reject(new Error(`HTTP ${r.status}：${url}`)),
  );

/** sizes 写的尺寸（"180x180"、"any"）；没写时 apple-touch-icon 按 180、SVG 按任意大、其余按 32 估计。 */
function declaredSize(url: string, sizes: string | null | undefined, type: string | null | undefined, touch: boolean) {
  if (sizes === 'any' || type === 'image/svg+xml' || url.endsWith('.svg')) return 1024;
  const size = Math.max(0, ...(sizes ?? '').split(/\s+/).map((s) => parseInt(s, 10) || 0));
  return size || (touch ? 180 : 32);
}

/** 网站在页面和 manifest 里声明的图标地址，按声明的尺寸从大到小。 */
async function declaredIcons(pageUrl: string) {
  const page = await get(pageUrl);
  // DOMParser 解析出的文档是惰性的，不会执行脚本或加载资源。
  const doc = new DOMParser().parseFromString(await page.text(), 'text/html');
  const icons: { url: string; size: number }[] = [];
  for (const link of doc.querySelectorAll('link[rel][href]')) {
    const rel = link.getAttribute('rel')!.toLowerCase();
    if (!/(^|\s)(icon|apple-touch-icon(-precomposed)?)(\s|$)/.test(rel)) continue;
    // 用 getAttribute：link.href 会相对这个扩展页面解析，而不是相对那个网站。
    const url = new URL(link.getAttribute('href')!, page.url).href;
    icons.push({ url, size: declaredSize(url, link.getAttribute('sizes'), link.getAttribute('type'), rel.includes('apple-touch-icon')) });
  }

  const manifestHref = doc.querySelector('link[rel="manifest"][href]')?.getAttribute('href');
  if (manifestHref) {
    const manifestUrl = new URL(manifestHref, page.url);
    // manifest 取不到不影响页面里声明的那些。
    const manifest: { icons?: { src?: unknown; sizes?: string; type?: string }[] } | null = await get(manifestUrl.href)
      .then((r) => r.json())
      .catch(() => null);
    for (const icon of manifest?.icons ?? []) {
      if (typeof icon.src !== 'string') continue;
      const url = new URL(icon.src, manifestUrl).href;
      icons.push({ url, size: declaredSize(url, icon.sizes, icon.type, false) });
    }
  }
  return [...new Set(icons.sort((a, b) => b.size - a.size).map((icon) => icon.url))];
}

/** 下载一张图并统一尺寸；占位图、太小（会糊）的不要。 */
async function download(url: string, placeholder?: IconSource['placeholder']) {
  const response = await get(url);
  const blob = await response.blob();
  if (await isPlaceholder(response, blob, placeholder)) throw new Error(`占位图：${url}`);
  const image = await toIconImage(blob);
  if (image.size < ICONS.minSize) throw new Error(`图标太小（${image.size}px）：${url}`);
  return image.src;
}

/**
 * 同时从各个来源取候选图标（统一后的 data URL）：网站自己声明的在前，然后是 ICONS.sources 里的各个服务。
 * 每个来源一个 Promise，先回来的可以先显示。单个来源取不到（连不上、超时、404、占位图、太小）是常事，结果是空数组，不算错误。
 */
export function findSiteIcons(pageUrl: string): Promise<string[]>[] {
  const domain = new URL(pageUrl).hostname;
  const own = declaredIcons(pageUrl).then(
    async (urls) => {
      const results = await Promise.allSettled(urls.slice(0, 6).map((url) => download(url)));
      return [...new Set(results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : [])))].slice(0, ICONS.ownMax);
    },
    () => [],
  );
  const services = ICONS.sources.map((source) =>
    download(source.url(domain), source.placeholder).then(
      (src) => [src],
      () => [],
    ),
  );
  return [own, ...services];
}

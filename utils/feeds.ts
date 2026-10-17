// 订阅（RSS / Atom）：取订阅地址、解析成标题、链接、时间、摘要；填的是网站首页时，从网页里找订阅地址。
// 用浏览器自带的 DOMParser 解析（只解析，不执行网页里的脚本）。格式各家不一样，认 RSS 2.0、RSS 1.0（RDF）和 Atom。
import { FEEDS } from '../config';
import { AppError } from './errors';
import { hasStrings } from './storage';

/** 一个订阅：地址是解析出来的订阅地址（不是用户填的网站首页） */
export type Feed = { id: string; url: string };
export const isFeed = hasStrings('id', 'url');

/** time：发布或更新的时间戳，没写或写错时没有；summary：纯文字的摘要 */
export type FeedItem = { title: string; url: string; time?: number; summary?: string };
export type FeedContent = { title: string; items: FeedItem[] };

/** 网站的地址，申请访问权限用 */
export const originOf = (url: string) => `${new URL(url).origin}/*`;

/** 订阅地址一律用 https 读：访问网站的权限只申请了 https；还写着 http 的订阅（feedburner 之类）几乎都支持 https */
const toHttps = (url: string) => url.replace(/^http:/i, 'https:');

/** 用户填的地址：补上 https://，http:// 换成 https://；不像网址时返回 null */
export function normalizeFeedUrl(input: string): string | null {
  const text = input.trim();
  try {
    const url = new URL(toHttps(/^[a-z]+:\/\//i.test(text) ? text : `https://${text}`));
    return url.protocol === 'https:' && url.hostname.includes('.') ? url.href : null;
  } catch {
    return null;
  }
}

/** HTML 片段转成纯文字（摘要、有的标题里也带标签）：去掉标签、合并空白 */
const plain = (html: string) => (new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '').replace(/\s+/g, ' ').trim();

/** 相对地址按订阅地址补全；只要 http(s) 的。没写（空的）时返回 null，不能补成 base 本身 */
function absolute(href: string | null | undefined, base: string) {
  if (!href?.trim()) return null;
  try {
    const url = new URL(href.trim(), base);
    return /^https?:$/.test(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

/** 第一个有内容的子元素的文字；按本地名找，不管命名空间前缀（dc:date、content:encoded） */
function text(el: Element, ...names: string[]) {
  for (const name of names) {
    const found = [...el.children].find((c) => c.localName === name || c.nodeName === name);
    const value = found?.textContent?.trim();
    if (value) return value;
  }
  return '';
}

function toItem(el: Element, base: string, atom: boolean): FeedItem | null {
  // Atom 的链接在 href 里，有几个时取 rel="alternate"（没写 rel 的也是）
  const link = atom
    ? [...el.children].find((c) => c.localName === 'link' && (c.getAttribute('rel') ?? 'alternate') === 'alternate')?.getAttribute('href')
    : text(el, 'link') || text(el, 'guid');
  const url = absolute(link, base);
  const title = plain(text(el, 'title'));
  if (!url || !title) return null;
  const time = Date.parse(text(el, 'published', 'updated', 'pubDate', 'date', 'dc:date'));
  const summary = plain(text(el, 'summary', 'description', 'content', 'encoded', 'content:encoded')).slice(0, FEEDS.summaryLength);
  return { title, url, time: Number.isNaN(time) ? undefined : time, summary: summary || undefined };
}

/** 解析订阅；不是 RSS / Atom 时返回 null */
export function parseFeed(xml: string, base: string): FeedContent | null {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const root = doc.documentElement;
  if (doc.querySelector('parsererror')) return null;
  const atom = root.localName === 'feed';
  if (!atom && root.localName !== 'rss' && root.localName !== 'RDF') return null;
  const channel = atom ? root : ([...root.children].find((c) => c.localName === 'channel') ?? root);
  // RSS 1.0 的 item 和 channel 是平级的
  const entries = [...root.getElementsByTagNameNS('*', atom ? 'entry' : 'item')];
  const items = entries.flatMap((el) => toItem(el, base, atom) ?? []).slice(0, FEEDS.itemsPerFeed);
  return { title: plain(text(channel, 'title')), items };
}

/** 网页里声明的订阅地址（<link rel="alternate" type="application/rss+xml">）；没有返回 null */
export function findFeedLink(html: string, base: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const link = doc.querySelector('link[rel~="alternate"][type="application/rss+xml"], link[rel~="alternate"][type="application/atom+xml"]');
  return absolute(link?.getAttribute('href'), base);
}

/** 按声明的编码转成文字：响应头的 charset，没有就看 XML 开头的 encoding（不少中文网站还是 GBK），都没有按 UTF-8 */
async function decode(response: Response) {
  const bytes = await response.arrayBuffer();
  const head = new TextDecoder('latin1').decode(bytes.slice(0, 200));
  const charset = /charset=([\w-]+)/i.exec(response.headers.get('content-type') ?? '')?.[1] ?? /encoding=["']([\w-]+)["']/i.exec(head)?.[1];
  try {
    return new TextDecoder(charset ?? 'utf-8').decode(bytes);
  } catch {
    // 不认识的编码名
    return new TextDecoder('utf-8').decode(bytes);
  }
}

async function download(url: string) {
  const host = new URL(url).hostname;
  const response = await fetch(url, { signal: AbortSignal.timeout(FEEDS.timeout) }).catch((cause) => {
    throw new AppError(cause.name === 'TimeoutError' ? `${host} 响应太慢，稍后会自动重试` : `连不上 ${host}，检查网络或代理`, { cause });
  });
  if (response.status === 404 || response.status === 410) throw new AppError(`${host} 上没有这个地址（HTTP ${response.status}）`);
  if (!response.ok) throw new AppError(`${host} 返回错误（HTTP ${response.status}）`);
  return decode(response);
}

/** 取一个订阅 */
export async function fetchFeed(url: string): Promise<FeedContent> {
  const feed = parseFeed(await download(url), url);
  if (!feed) throw new AppError(`${new URL(url).hostname} 返回的不是 RSS / Atom 订阅，可能换了地址`);
  return feed;
}

/**
 * 添加时用：地址本身是订阅就直接用；是网页的话找它声明的订阅地址。
 * 返回 content 时已经取到了；只返回 url 时订阅地址在别的网站上，要先申请访问它的权限再取。
 */
export async function discoverFeed(url: string): Promise<{ url: string; content?: FeedContent }> {
  const body = await download(url);
  const content = parseFeed(body, url);
  if (content) return { url, content };
  const link = findFeedLink(body, url);
  if (!link) throw new AppError('这个网址不是 RSS / Atom 订阅，网页里也没有找到订阅地址');
  const found = toHttps(link);
  if (new URL(found).origin !== new URL(url).origin) return { url: found };
  return { url: found, content: await fetchFeed(found) };
}

/** 订阅的名字：订阅里写的标题，还没取到时用域名 */
export const feedName = (feed: Feed, content: FeedContent | null | undefined) =>
  content?.title || new URL(feed.url).hostname.replace(/^www\./, '');

/** 几个订阅的文章合在一起，新的在前；没写时间的排在最后，按订阅里的顺序 */
export function mergeItems(feeds: Feed[], contents: Record<string, FeedContent | null | undefined>) {
  return feeds
    .flatMap((feed) => (contents[feed.url]?.items ?? []).map((item) => ({ ...item, feed })))
    .sort((a, b) => (b.time ?? -Infinity) - (a.time ?? -Infinity));
}

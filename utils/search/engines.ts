// 搜索引擎：常用的内置在 config.ts（SEARCH_ENGINES），用户的列表（用哪些、顺序、自己加的）存在 niwa:engines。
// 自己加的从网站首页声明的 OpenSearch 描述里识别（浏览器自动发现搜索引擎用的就是它），识别不了时用搜索结果的网址（template.ts）。
import { SEARCH, SEARCH_ENGINES } from '../../config';
import { AppError } from '../errors';
import { hasStrings } from '../storage';
import { PROBE, isTemplate, siteName, templateFromOpenSearch } from './template';

/** url 里的 %s 换成搜索词。内置的 id 就是名字（以前按名字记住选的哪个），自己加的是随机 id。 */
export type Engine = { id: string; name: string; url: string };

const hasFields = hasStrings('id', 'name', 'url');
export const isEngine = (v: unknown): v is Engine => hasFields(v) && isTemplate(v.url);

/** 第一次打开时的列表 */
export const DEFAULT_ENGINES: Engine[] = SEARCH_ENGINES.slice(0, SEARCH.initial).map(({ id, name, url }) => ({ id, name, url }));

/** 内置的那一个（带打包好的图标）；自己加的没有 */
export const presetOf = (engine: Engine) => SEARCH_ENGINES.find((p) => p.id === engine.id);

async function get(url: string) {
  const host = new URL(url).hostname;
  const response = await fetch(url, { signal: AbortSignal.timeout(SEARCH.timeout) }).catch((cause) => {
    throw new AppError(cause.name === 'TimeoutError' ? `${host} 响应太慢，稍后再试` : `连不上 ${host}，检查网络或代理`, { cause });
  });
  if (!response.ok) throw new AppError(`${host} 返回错误（HTTP ${response.status}）`);
  return response.text();
}

/** 读网站首页声明的 OpenSearch 描述，得出名称和搜索地址。要先有访问这个网站的权限。 */
export async function discoverEngine(site: URL): Promise<Engine> {
  const missing = new AppError(`${site.hostname} 没有写明它的搜索方式。在那个网站搜一下 ${PROBE}，把地址栏里的网址粘贴过来`);
  const page = new DOMParser().parseFromString(await get(site.href), 'text/html');
  const href = page.querySelector('link[rel~="search"][type="application/opensearchdescription+xml"]')?.getAttribute('href');
  if (!href) throw missing;
  const xml = new DOMParser().parseFromString(await get(new URL(href, site).href), 'application/xml');
  const tags = (name: string) => [...xml.getElementsByTagNameNS('*', name)];
  const html = tags('Url').find(
    (u) => (u.getAttribute('type') ?? 'text/html') === 'text/html' && (u.getAttribute('method') ?? 'get').toLowerCase() === 'get',
  );
  const url = templateFromOpenSearch(html?.getAttribute('template') ?? '');
  if (!url) throw missing;
  return { id: crypto.randomUUID(), name: tags('ShortName')[0]?.textContent?.trim() || siteName(site), url };
}

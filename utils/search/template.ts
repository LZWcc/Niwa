// 搜索引擎的网址模板：搜索词的位置写成 %s（和浏览器自己的搜索引擎设置一样）。只在程序里用，用户不用写它：
// 内置的写在 config.ts；自己加的从网站声明的 OpenSearch 描述、或者用户粘贴的一次搜索结果的网址里得出来。
// 这里都是纯函数、不引用别的模块（单元测试 tests/unit/search.test.mjs 直接引用）。

/** 识别不了时，让用户在那个网站搜这个词，再把地址栏里的网址粘贴过来 */
export const PROBE = 'niwa';

const MARK = '%s';
/** 拼网址时先占住搜索词的位置，拼完换成 %s（直接放 %s 会被编码成 %25s） */
const SLOT = 'niwa-query-slot';

/** 用 template 搜索 query 的网址 */
export const searchUrl = (template: string, query: string) => template.replace(MARK, encodeURIComponent(query));

export function isTemplate(template: string) {
  try {
    return /^https?:$/.test(new URL(template.replace(MARK, 'x')).protocol) && template.includes(MARK);
  } catch {
    return false;
  }
}

/** 用户填的网址：补上 https://，http:// 换成 https://（访问网站的权限只申请了 https）；不像网址时返回 null */
export function toUrl(input: string): URL | null {
  const text = input.trim().replace(/^http:/i, 'https:');
  try {
    const url = new URL(/^[a-z]+:\/\//i.test(text) ? text : `https://${text}`);
    return url.protocol === 'https:' && url.hostname.includes('.') ? url : null;
  } catch {
    return null;
  }
}

/** 网站的名字：域名去掉 www. */
export const siteName = (url: URL) => url.hostname.replace(/^www\./, '');

/**
 * 一次搜索 PROBE 的结果网址 → 模板：参数值是 PROBE 的那个换成 %s；别的参数里也带着它的（Google 的 oq）去掉，
 * 其余参数（GitHub 的 type）留着。参数里没有时看路径（/search/niwa）。都没有返回 null。
 */
export function templateFromResult(url: URL): string | null {
  const next = new URL(url);
  next.hash = '';
  const params = [...url.searchParams];
  const at = params.findIndex(([, v]) => v.trim().toLowerCase() === PROBE);
  if (at >= 0) {
    next.search = '';
    params
      .map(([k, v], i): [string, string] => [k, i === at ? SLOT : v])
      .filter(([, v]) => v === SLOT || !v.toLowerCase().includes(PROBE))
      .forEach(([k, v]) => next.searchParams.append(k, v));
    return next.href.replace(SLOT, MARK);
  }
  const parts = url.pathname.split('/');
  const p = parts.findIndex((s) => s.toLowerCase() === PROBE);
  if (p < 0) return null;
  parts[p] = SLOT;
  next.pathname = parts.join('/');
  return next.href.replace(SLOT, MARK);
}

/**
 * OpenSearch 描述里的模板 → %s 的写法：{searchTerms} 是搜索词，{xxx?} 是可选参数（去掉），编码写 UTF-8。
 * 还有别的必填参数、或者不是网址时返回 null。
 */
export function templateFromOpenSearch(template: string): string | null {
  const q = template.indexOf('?');
  const base = q < 0 ? template : template.slice(0, q);
  const params =
    q < 0
      ? []
      : template
          .slice(q + 1)
          .split('&')
          .filter((p) => p && !/=\{[^}]*\?\}$/.test(p));
  const url = (params.length ? `${base}?${params.join('&')}` : base)
    .replace('{searchTerms}', MARK)
    .replace(/\{(input|output)Encoding\}/g, 'UTF-8');
  return !/[{}]/.test(url) && isTemplate(url) ? url : null;
}

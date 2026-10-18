// 热榜：取各网站的热榜接口（地址在 config.ts 的 HOTLIST），统一成标题、链接、热度。
// 这些都是网站自己网页上用的接口，格式随时可能变：每个来源的解析都先看格式对不对，不对就说暂时用不了，不往下猜。
import { HOTLIST, type HotSource } from '../config';
import { AppError } from './errors';

export type HotItem = { title: string; url: string; hot?: string };
export type HotSourceId = HotSource['id'];

export const HOT_SOURCES = new Map<HotSourceId, HotSource>(HOTLIST.sources.map((s) => [s.id, s]));

/** 一万以上写成“681万” */
const wan = (n: number) => (n >= 10_000 ? `${Math.round(n / 10_000)}万` : String(n));

type Json = Record<string, unknown>;
const list = (v: unknown) => (Array.isArray(v) ? (v as Json[]) : null);

// 每个来源怎么从返回的数据里拿出条目；格式不对时返回 null
const PARSERS: Record<HotSourceId, (data: Json) => HotItem[] | null> = {
  zhihu: (d) =>
    list(d.data)?.map((x) => {
      const t = x.target as Json;
      // 问题 id 有 19 位，超出 JS 数字能精确表示的范围（解析 JSON 时末尾几位会变），从链接的字符串里取
      const id = /\/questions\/(\d+)/.exec(String(t.url))?.[1];
      return {
        title: String(t.title),
        url: `https://www.zhihu.com/question/${id}`,
        hot: String(x.detail_text ?? '')
          .replace(/\s*热度$/, '')
          .replace(' ', ''),
      };
    }) ?? null,
  weibo: (d) =>
    list((d.data as Json | undefined)?.realtime)?.map((x) => ({
      title: String(x.word),
      url: `https://s.weibo.com/weibo?q=${encodeURIComponent(`#${String(x.word)}#`)}`,
      hot: typeof x.num === 'number' ? wan(x.num) : undefined,
    })) ?? null,
  bilibili: (d) =>
    list((d.data as Json | undefined)?.list)?.map((x) => ({
      title: String(x.title),
      url: `https://www.bilibili.com/video/${String(x.bvid)}`,
      hot: `${wan(Number((x.stat as Json).view))}播放`,
    })) ?? null,
  baidu: (d) => {
    const card = list((d.data as Json | undefined)?.cards)?.[0];
    const content = list(card?.content);
    // 有时外面还包着一层
    const items = list(content?.[0]?.content) ?? content;
    return (
      items?.map((x) => ({
        title: String(x.word),
        url: `https://www.baidu.com/s?wd=${encodeURIComponent(String(x.word))}`,
        hot: x.hotScore ? wan(Number(x.hotScore)) : undefined,
      })) ?? null
    );
  },
  toutiao: (d) =>
    list(d.data)?.map((x) => ({
      title: String(x.Title),
      url: String(x.Url),
      hot: x.HotValue ? wan(Number(x.HotValue)) : undefined,
    })) ?? null,
  juejin: (d) =>
    list(d.data)?.map((x) => {
      const c = x.content as Json;
      return {
        title: String(c.title),
        url: `https://juejin.cn/post/${String(c.content_id)}`,
        hot: String((x.content_counter as Json).hot_rank),
      };
    }) ?? null,
};

/** 网站的地址，申请访问权限用 */
export const originOf = (source: HotSource) => `${new URL(source.url).origin}/*`;

export async function fetchHotList(source: HotSource): Promise<HotItem[]> {
  const response = await fetch(source.url, {
    // 要登录的来源带上这个浏览器里的登录状态
    credentials: source.login ? 'include' : 'omit',
    signal: AbortSignal.timeout(HOTLIST.timeout),
  }).catch((cause) => {
    throw new AppError(cause.name === 'TimeoutError' ? `${source.name}响应太慢，稍后会自动重试` : `连不上${source.name}，检查网络或代理`, {
      cause,
    });
  });
  if (source.login && (response.status === 401 || response.status === 403)) {
    throw new AppError(`${source.name}要先登录：在这个浏览器里登录 ${new URL(source.url).hostname.replace(/^www\./, '')} 后再试`);
  }
  if (!response.ok) throw new AppError(`${source.name}返回错误（HTTP ${response.status}）`);
  let items: HotItem[] | null = null;
  try {
    items = PARSERS[source.id]((await response.json()) as Json);
  } catch {
    // 解析过程中格式不对（字段没了、类型变了）：和下面的 null 一样处理
  }
  if (
    !items?.length ||
    items.some((x) => !x.title || x.title === 'undefined' || !/^https:\/\/\S+$/.test(x.url) || x.url.includes('undefined'))
  ) {
    throw new AppError(`${source.name}的数据格式变了，暂时用不了`);
  }
  return items;
}

import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { hostOf, isWebUrl, type HistoryTab } from '@/utils/browsing';
import { samplePages } from '@/utils/sample';
import { useSample } from './useSample';

/** 列表里的一页。time：最近访问或关闭的时间（常去没有）；session：最近关闭的，点了恢复它 */
export type Page = { key: string; url: string; title: string; time?: number; session?: string };

// 浏览器的历史本来就是每个网址一条、按最后访问时间排好的；text 按标题和网址搜索，空字符串是全部。
// 多取几倍再去掉 chrome:// 这类，凑够 limit 条。
const visits = async (text: string, limit: number): Promise<Page[]> =>
  (await browser.history.search({ text, startTime: 0, maxResults: limit * 4 }))
    .flatMap((h) => (isWebUrl(h.url) ? [{ key: h.id, url: h.url, title: h.title || hostOf(h.url), time: h.lastVisitTime }] : []))
    .slice(0, limit);

const LOADERS: Record<HistoryTab, (limit: number) => Promise<Page[]>> = {
  recent: (limit) => visits('', limit),
  // 和浏览器自带的新标签页「常去网站」是同一份数据。
  top: async () =>
    (await browser.topSites.get()).flatMap((s) => (isWebUrl(s.url) ? [{ key: s.url, url: s.url, title: s.title || hostOf(s.url) }] : [])),
  // 关掉的窗口显示为一条，恢复时整个窗口一起回来。网址和标题要有 tabs 权限才拿得到。
  closed: async () =>
    (await browser.sessions.getRecentlyClosed({ maxResults: 25 })).flatMap(({ tab, window: win, lastModified }) => {
      const first = tab ?? win?.tabs?.[0];
      const session = (tab ?? win)?.sessionId;
      if (!first || !session || !isWebUrl(first.url)) return [];
      const title = first.title || hostOf(first.url);
      return [
        {
          key: session,
          url: first.url,
          title: tab ? title : `${win!.tabs!.length} 个标签页 · ${title}`,
          // lastModified 的单位是秒
          time: lastModified * 1000,
          session,
        },
      ];
    }),
};

/**
 * 历史小组件的列表：query 不为空时搜索全部浏览记录，否则是 tab 这一组；tab 为 null（还没有权限、大面板没打开）时不读。
 * limit：浏览记录最多几条（卡片 50，大面板更多）。
 * now 每分钟和页面重新可见时都会变，借此重新读一遍，不另外监听。预览里是演示的几条。
 */
export function useBrowsingHistory(tab: HistoryTab | null, query: string, now: Date, limit = 50) {
  const sample = useSample();
  const q = query.trim();
  const key = q ? `?${q}` : tab;
  const [result, setResult] = useState<{ key: string; pages: Page[] } | null>(null);
  const [restored, setRestored] = useState(0);

  useEffect(() => {
    if (!tab || sample) return;
    let alive = true;
    void (q ? visits(q, limit) : LOADERS[tab](limit)).then((pages) => {
      if (alive) setResult({ key: q ? `?${q}` : tab, pages });
    });
    return () => {
      alive = false;
    };
  }, [tab, q, now, restored, limit, sample]);

  // 恢复后它就不在「最近关闭」里了，重新读一遍。
  const restore = (session: string) => void browser.sessions.restore(session).then(() => setRestored((n) => n + 1));

  if (sample) return { pages: tab && samplePages(tab, now), restore };
  return { pages: tab && result?.key === key ? result.pages : null, restore };
}

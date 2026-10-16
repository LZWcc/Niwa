import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { hostOf, isExcluded, isWebUrl } from '@/utils/browsing';
import { hasPermissions } from '@/utils/permissions';

export type Suggestion = { url: string; title: string; kind: 'bookmark' | 'history' };

/** 最多几条；收藏排在前面，最多占一半 */
const LIMIT = 6;

async function find(text: string, excluded: string[]) {
  const [bookmarks, history] = await Promise.all([hasPermissions(['bookmarks']), hasPermissions(['history'])]);
  const marked = bookmarks
    ? (await browser.bookmarks.search(text)).flatMap((n) =>
        isWebUrl(n.url) ? [{ url: n.url, title: n.title || hostOf(n.url), kind: 'bookmark' as const }] : [],
      )
    : [];
  // 浏览记录按访问次数排：常去的在前
  const visited = history
    ? (await browser.history.search({ text, startTime: 0, maxResults: 50 }))
        .sort((a, b) => (b.visitCount ?? 0) - (a.visitCount ?? 0))
        .flatMap((h) => (isWebUrl(h.url) ? [{ url: h.url, title: h.title || hostOf(h.url), kind: 'history' as const }] : []))
    : [];
  // 同一个网址只留一条（收藏优先）；浏览记录不够时再多放几条收藏。
  const seen = new Set<string>();
  const items = [...marked.slice(0, LIMIT / 2), ...visited, ...marked.slice(LIMIT / 2)]
    .filter((s) => !isExcluded(s.url, excluded) && !seen.has(s.url) && seen.add(s.url))
    .slice(0, LIMIT);
  return { items, allowed: bookmarks || history };
}

/**
 * 搜索框的联想：在收藏夹和浏览记录里找，只读本地数据，跳过排除的网站。
 * allowed：有没有读取它们的权限（收藏夹、历史小组件申请的）。
 * 换了关键词时先保留上一次的结果，不闪；refresh 在刚给了权限后重新找一遍。
 */
export function useSuggestions(query: string, excluded: string[]) {
  const text = query.trim();
  const [result, setResult] = useState<{ items: Suggestion[]; allowed: boolean } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!text) return;
    let alive = true;
    void find(text, excluded).then((r) => {
      if (alive) setResult(r);
    });
    return () => {
      alive = false;
    };
    // 排除的网站按内容比较，列表每次渲染都是新数组。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, version, excluded.join()]);

  return { result: text ? result : null, refresh: () => setVersion((n) => n + 1) };
}

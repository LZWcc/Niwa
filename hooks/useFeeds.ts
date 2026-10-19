import { useEffect, useRef, useState } from 'react';
import { FEEDS } from '@/config';
import { DAY } from '@/utils/date';
import { toUserMessage } from '@/utils/errors';
import { fetchFeed, type Feed, type FeedContent } from '@/utils/feeds';
import { sampleFeedEntries } from '@/utils/sample';
import { KEYS, readJson, writeJson } from '@/utils/storage';
import { useSample } from './useSample';

/** 一个订阅的上一次结果。error：这次没更新成功的原因（content 保留上一次的） */
export type FeedEntry = { fetchedAt: number; content: FeedContent | null; error: string | null };
type Cache = Record<string, FeedEntry>;

const isEntry = (v: unknown): v is FeedEntry => typeof (v as FeedEntry | null)?.fetchedAt === 'number' && 'content' in (v as FeedEntry);
const readCache = (): Cache =>
  Object.fromEntries(
    Object.entries(readJson(KEYS.feedCache, (v): v is object => typeof v === 'object' && v !== null) ?? {}).filter(([, e]) => isEntry(e)),
  );

/** 写进缓存（一天没看的订阅丢掉），返回新的缓存 */
function save(changes: Cache) {
  const next = Object.fromEntries(Object.entries({ ...readCache(), ...changes }).filter(([, e]) => Date.now() - e.fetchedAt < DAY));
  writeJson(KEYS.feedCache, next);
  return next;
}

/**
 * 一个订阅小组件里的几个订阅：先用本地缓存，过期（30 分钟，失败后 5 分钟）的再取。enabled 为 false（还没有访问那些网站的权限）时不取。
 * 和热榜一样省请求：只有正在看的标签页去取，取之前再读一遍缓存，别的标签页、别的订阅小组件刚取过就直接用。
 * 预览里是演示的文章，不取。
 */
export function useFeeds(feeds: Feed[], enabled: boolean, now: Date) {
  const sample = useSample();
  const [cache, setCache] = useState(readCache);
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);
  const key = enabled ? feeds.map((f) => f.url).join('|') : '';

  /** 取这些订阅（默认是全部），同时取，各自记下结果 */
  const refresh = async (urls = feeds.map((f) => f.url)) => {
    if (busy.current || !enabled || !urls.length) return;
    busy.current = true;
    setLoading(true);
    try {
      const results = await Promise.all(
        urls.map(async (url): Promise<[string, FeedEntry]> => {
          try {
            return [url, { fetchedAt: Date.now(), content: await fetchFeed(url), error: null }];
          } catch (error) {
            return [url, { fetchedAt: Date.now(), content: readCache()[url]?.content ?? null, error: toUserMessage(error, '更新订阅') }];
          }
        }),
      );
      setCache(save(Object.fromEntries(results)));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  /** 添加时已经取到了内容：直接存下，不再请求一次 */
  const remember = (url: string, content: FeedContent) => setCache(save({ [url]: { fetchedAt: Date.now(), content, error: null } }));

  useEffect(() => {
    if (!key || document.hidden || sample) return;
    const latest = readCache();
    setCache(latest);
    const stale = feeds
      .map((f) => f.url)
      .filter((url) => {
        const entry = latest[url];
        return !entry || Date.now() - entry.fetchedAt > (entry.error ? FEEDS.retryAfter : FEEDS.refreshEvery);
      });
    if (stale.length) void refresh(stale);
    // 每分钟（now 变，回到这个标签页时也变）和订阅变了时检查一次哪些该刷新；其余都是这次渲染里的值。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, key]);

  return { entries: sample ? sampleFeedEntries(now) : cache, loading, refresh: () => refresh(), remember };
}

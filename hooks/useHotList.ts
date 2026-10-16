import { useEffect, useRef, useState } from 'react';
import { HOTLIST, type HotSource } from '@/config';
import { DAY } from '@/utils/date';
import { toUserMessage } from '@/utils/errors';
import { fetchHotList, type HotItem } from '@/utils/hotlist';
import { KEYS, readJson, writeJson } from '@/utils/storage';

/** 一个来源的上一次结果。error：这次没更新成功的原因（items 保留上一次的） */
type Entry = { fetchedAt: number; items: HotItem[] | null; error: string | null };
type Cache = Record<string, Entry>;

const isEntry = (v: unknown): v is Entry => typeof (v as Entry | null)?.fetchedAt === 'number' && 'items' in (v as Entry);
const readCache = (): Cache =>
  Object.fromEntries(
    Object.entries(readJson(KEYS.hotlistCache, (v): v is object => typeof v === 'object' && v !== null) ?? {}).filter(([, e]) =>
      isEntry(e),
    ),
  );

/**
 * 一个来源的热榜：先用本地缓存，过期（30 分钟，失败后 5 分钟）再取。source 为 null（还没有访问那个网站的权限）时不取。
 * 和天气一样省请求：只有正在看的标签页去取，取之前再读一遍缓存，别的标签页、别的热榜小组件刚取过就直接用。
 */
export function useHotList(source: HotSource | null, now: Date) {
  const [cache, setCache] = useState(readCache);
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);
  const key = source?.id ?? '';

  const refresh = async () => {
    if (busy.current || !source) return;
    busy.current = true;
    setLoading(true);
    try {
      let entry: Entry;
      try {
        entry = { fetchedAt: Date.now(), items: await fetchHotList(source), error: null };
      } catch (error) {
        entry = {
          fetchedAt: Date.now(),
          items: readCache()[source.id]?.items ?? null,
          error: toUserMessage(error, `更新${source.name}热榜`),
        };
      }
      // 一天没看的来源丢掉
      const next = Object.fromEntries(
        Object.entries({ ...readCache(), [source.id]: entry }).filter(([, e]) => Date.now() - e.fetchedAt < DAY),
      );
      writeJson(KEYS.hotlistCache, next);
      setCache(next);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!key || document.hidden) return;
    const latest = readCache();
    const current = latest[key];
    if (current !== cache[key]) setCache(latest);
    const age = current ? Date.now() - current.fetchedAt : Infinity;
    if (age > (current?.error ? HOTLIST.retryAfter : HOTLIST.refreshEvery)) void refresh();
    // 每分钟（now 变，回到这个标签页时也变）和换了来源时检查一次是否该刷新；其余都是这次渲染里的值。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, key]);

  const current = key ? cache[key] : undefined;
  return { items: current?.items ?? null, error: current?.error ?? null, loading, refresh };
}

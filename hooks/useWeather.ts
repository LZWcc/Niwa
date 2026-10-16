import { useEffect, useRef, useState } from 'react';
import { WEATHER } from '@/config';
import { DAY } from '@/utils/date';
import { toUserMessage } from '@/utils/errors';
import { KEYS, readJson, writeJson } from '@/utils/storage';
import { fetchForecast, isWeatherAccount, type Forecast, type Place, type WeatherAccount } from '@/utils/weather';
import { useStored } from './useStored';

/** 一个城市的上一次结果。error：这次没更新成功的原因（forecast 保留上一次的） */
type Entry = { fetchedAt: number; forecast: Forecast | null; error: string | null };
/** 按「城市 | API Host | KEY」分开存：放了几个天气小组件时各有各的，不互相覆盖 */
type Cache = Record<string, Entry>;

const isEntry = (v: unknown): v is Entry => typeof (v as Entry | null)?.fetchedAt === 'number' && 'forecast' in (v as Entry);
/** 只认格式对的条目：升级前的缓存只存一个城市（{ key, fetchedAt, forecast, error }），整个当作没有 */
const readCache = (): Cache =>
  Object.fromEntries(
    Object.entries(readJson(KEYS.weatherCache, (v): v is object => typeof v === 'object' && v !== null) ?? {}).filter(([, e]) =>
      isEntry(e),
    ),
  );

/**
 * 一个城市的天气：先用本地缓存立即显示，过期（30 分钟，失败后 5 分钟）再在后台刷新。没填 KEY 或没选城市时不联网。
 * 城市由各个天气小组件自己选（settings.place），和风的 KEY 共用。
 * now 每分钟和页面重新可见时都会变，借此检查是否需要刷新，不另设定时器。
 */
export function useWeather(now: Date, place: Place | null) {
  const [account, setAccount] = useStored<WeatherAccount | null>(KEYS.weatherAccount, () =>
    readJson(KEYS.weatherAccount, isWeatherAccount),
  );
  const [cache, setCache] = useState(readCache);
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);
  // 换了 KEY 也重新取：上一次可能就是 KEY 填错了。
  const key = account && place ? `${place.id}|${account.host}|${account.key}` : '';

  const refresh = async () => {
    if (busy.current || !account || !place) return;
    busy.current = true;
    setLoading(true);
    // 放在 finally 里放下标记：哪一步出了意外，也不会一直挡着之后的刷新。
    try {
      let entry: Entry;
      try {
        entry = { fetchedAt: Date.now(), forecast: await fetchForecast(account, place), error: null };
      } catch (error) {
        // 失败时保留这个城市上一次的数据（哪怕是换 KEY 之前取的）
        const previous = Object.entries(readCache()).find(([k]) => k.startsWith(`${place.id}|`))?.[1];
        entry = { fetchedAt: Date.now(), forecast: previous?.forecast ?? null, error: toUserMessage(error, `更新天气 ${place.name}`) };
      }
      // 别的天气小组件可能刚写过，先读最新的再合并；顺手丢掉一天没更新的（城市换掉了、小组件移除了）。
      const next = Object.fromEntries(Object.entries({ ...readCache(), [key]: entry }).filter(([, e]) => Date.now() - e.fetchedAt < DAY));
      writeJson(KEYS.weatherCache, next);
      setCache(next);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!key) return;
    const current = cache[key];
    const age = current ? Date.now() - current.fetchedAt : Infinity;
    if (age > (current?.error ? WEATHER.retryAfter : WEATHER.refreshEvery)) void refresh();
    // 每分钟（now 变）和换了城市、KEY（key 变）时检查一次是否该刷新；其余都是这次渲染里的值。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, key]);

  const current = key ? cache[key] : undefined;
  return {
    account,
    setAccount,
    place,
    forecast: current?.forecast ?? null,
    fetchedAt: current?.fetchedAt ?? 0,
    error: current?.error ?? null,
    loading,
    refresh,
  };
}

/** useWeather 的返回值 */
export type WeatherState = ReturnType<typeof useWeather>;

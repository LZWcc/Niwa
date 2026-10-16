import { useEffect, useRef, useState } from 'react';
import { WEATHER } from '@/config';
import { toUserMessage } from '@/utils/errors';
import { KEYS, readJson, writeJson } from '@/utils/storage';
import { fetchForecast, isPlace, isWeatherAccount, type Forecast, type Place, type WeatherAccount } from '@/utils/weather';
import { useStored } from './useStored';

/** key：哪个城市的；error：这次没更新成功的原因（forecast 保留上一次的） */
type Cache = { key: string; fetchedAt: number; forecast: Forecast | null; error: string | null };

const isCache = (v: unknown): v is Cache => typeof (v as Cache | null)?.key === 'string' && 'forecast' in (v as Cache);
const readCache = () => readJson(KEYS.weatherCache, isCache);

/**
 * 天气数据：先用本地缓存立即显示，过期（30 分钟，失败后 5 分钟）再在后台刷新。没填 KEY 或没选城市时不联网。
 * now 每分钟和页面重新可见时都会变，借此检查是否需要刷新，不另设定时器。
 */
export function useWeather(now: Date) {
  const [account, setAccount] = useStored<WeatherAccount | null>(KEYS.weatherAccount, () =>
    readJson(KEYS.weatherAccount, isWeatherAccount),
  );
  const [place, setPlace] = useStored<Place | null>(KEYS.weather, () => readJson(KEYS.weather, isPlace));
  const [cache, setCache] = useState(readCache);
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);
  // 换了 KEY 也重新取：上一次可能就是 KEY 填错了。
  const key = account && place ? `${place.id}|${account.host}|${account.key}` : '';

  const refresh = async () => {
    if (busy.current || !account || !place) return;
    busy.current = true;
    setLoading(true);
    let next: Cache;
    try {
      next = { key, fetchedAt: Date.now(), forecast: await fetchForecast(account, place), error: null };
    } catch (error) {
      const previous = readCache();
      next = {
        key,
        fetchedAt: Date.now(),
        forecast: previous?.key.startsWith(`${place.id}|`) ? previous.forecast : null,
        error: toUserMessage(error, `更新天气 ${place.name}`),
      };
    }
    writeJson(KEYS.weatherCache, next);
    setCache(next);
    busy.current = false;
    setLoading(false);
  };

  useEffect(() => {
    if (!key) return;
    const age = cache?.key === key ? Date.now() - cache.fetchedAt : Infinity;
    if (age > (cache?.error ? WEATHER.retryAfter : WEATHER.refreshEvery)) void refresh();
    // 每分钟（now 变）和换了城市、KEY（key 变）时检查一次是否该刷新；其余都是这次渲染里的值。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, key]);

  const current = cache?.key === key ? cache : null;
  return {
    account,
    setAccount,
    place,
    setPlace,
    forecast: current?.forecast ?? null,
    fetchedAt: current?.fetchedAt ?? 0,
    error: current?.error ?? null,
    loading,
    refresh,
  };
}

/** useWeather 的返回值 */
export type WeatherState = ReturnType<typeof useWeather>;

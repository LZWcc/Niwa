// 天气：搜城市、取预报（Open-Meteo），以及天气代码（WMO）对应的说法和图标、时间的写法。
import { WEATHER } from '../config';
import { DAY, WEEKDAYS } from './date';
import { AppError } from './errors';
import { hasStrings } from './storage';

/** 选的城市。region：省份、国家，同名城市靠它区分 */
export type Place = { id: string; name: string; region: string; lat: number; lon: number };
export const isPlace = (v: unknown): v is Place =>
  hasStrings('id', 'name', 'region')(v) && typeof (v as Place).lat === 'number' && typeof (v as Place).lon === 'number';

/** 时间都是时间戳（毫秒）；offset 是城市所在时区的 UTC 偏移（毫秒），按城市当地时间写钟点和星期 */
export type Forecast = {
  offset: number;
  current: { temp: number; feels: number; humidity: number; wind: number; code: number; day: boolean };
  hours: { time: number; temp: number; code: number; day: boolean }[];
  days: { time: number; code: number; max: number; min: number }[];
};

export type WeatherKind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder';

async function getJson(url: string): Promise<unknown> {
  // fetch 只在连不上或超时的时候抛错；HTTP 错误码要自己判断。
  const response = await fetch(url, { signal: AbortSignal.timeout(WEATHER.timeout) }).catch((cause) => {
    throw new AppError(cause.name === 'TimeoutError' ? '天气服务响应太慢，稍后会自动重试' : '连不上天气服务，检查网络或代理', { cause });
  });
  if (!response.ok) throw new AppError(`天气服务返回错误（HTTP ${response.status}）`);
  return response.json();
}

type GeoResult = { id: number; name: string; latitude: number; longitude: number; admin1?: string; country?: string };

/** 按名称搜城市，返回中文名；没找到是空数组。 */
export async function searchPlaces(name: string): Promise<Place[]> {
  const data = (await getJson(`${WEATHER.geocode}?${new URLSearchParams({ name, count: '8', language: 'zh', format: 'json' })}`)) as {
    results?: GeoResult[];
  };
  return (data.results ?? []).map((r) => ({
    id: String(r.id),
    name: r.name,
    region: [r.admin1, r.country].filter((s) => s && s !== r.name).join('，'),
    lat: r.latitude,
    lon: r.longitude,
  }));
}

type RawForecast = {
  utc_offset_seconds: number;
  current: Record<
    'temperature_2m' | 'apparent_temperature' | 'relative_humidity_2m' | 'weather_code' | 'is_day' | 'wind_speed_10m',
    number
  >;
  hourly: Record<'time' | 'temperature_2m' | 'weather_code' | 'is_day', number[]>;
  daily: Record<'time' | 'weather_code' | 'temperature_2m_max' | 'temperature_2m_min', number[]>;
};

/** 当前天气、接下来 24 小时和 7 天。 */
export async function fetchForecast(place: Place): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: String(place.lat),
    longitude: String(place.lon),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m',
    hourly: 'temperature_2m,weather_code,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    timeformat: 'unixtime',
    forecast_days: '7',
  });
  const raw = (await getJson(`${WEATHER.forecast}?${params}`)) as RawForecast;
  if (typeof raw?.current?.temperature_2m !== 'number' || !Array.isArray(raw.hourly?.time) || !Array.isArray(raw.daily?.time)) {
    throw new AppError('天气服务返回的数据不对');
  }
  const { current: c, hourly: h, daily: d } = raw;
  // 从这一小时开始取 24 小时；缓存期间按当前时间再往后挪。
  const from = Date.now() - 3_600_000;
  return {
    offset: raw.utc_offset_seconds * 1000,
    current: {
      temp: c.temperature_2m,
      feels: c.apparent_temperature,
      humidity: c.relative_humidity_2m,
      wind: c.wind_speed_10m,
      code: c.weather_code,
      day: c.is_day === 1,
    },
    hours: h.time
      .map((t, i) => ({ time: t * 1000, temp: h.temperature_2m[i]!, code: h.weather_code[i]!, day: h.is_day[i] === 1 }))
      .filter((x) => x.time > from)
      .slice(0, 24),
    days: d.time.map((t, i) => ({
      time: t * 1000,
      code: d.weather_code[i]!,
      max: d.temperature_2m_max[i]!,
      min: d.temperature_2m_min[i]!,
    })),
  };
}

/** 天气代码（WMO）的说法和图标 */
export function describe(code: number): { label: string; kind: WeatherKind } {
  if (code === 0) return { label: '晴', kind: 'clear' };
  if (code <= 2) return { label: code === 1 ? '晴间少云' : '多云', kind: 'partly' };
  if (code === 3) return { label: '阴', kind: 'cloudy' };
  if (code <= 48) return { label: '雾', kind: 'fog' };
  if (code <= 57) return { label: '毛毛雨', kind: 'drizzle' };
  if (code <= 67) return { label: ({ 61: '小雨', 63: '中雨', 65: '大雨' } as Record<number, string>)[code] ?? '冻雨', kind: 'rain' };
  if (code <= 77) return { label: ({ 71: '小雪', 73: '中雪', 75: '大雪' } as Record<number, string>)[code] ?? '雪', kind: 'snow' };
  if (code <= 82) return { label: '阵雨', kind: 'rain' };
  if (code <= 86) return { label: '阵雪', kind: 'snow' };
  return { label: '雷雨', kind: 'thunder' };
}

export const deg = (t: number) => `${Math.round(t)}°`;

/** 城市当地的第几天，用来比较是不是同一天 */
const localDay = (t: number, offset: number) => Math.floor((t + offset) / DAY);

/** 逐小时预报的钟点：当前这一小时写“现在” */
export const hourLabel = (t: number, now: Date, offset: number) =>
  t <= now.getTime() ? '现在' : `${new Date(t + offset).getUTCHours()}时`;

/** 每日预报的日子：今天、明天，再往后写星期 */
export function weekdayLabel(t: number, now: Date, offset: number) {
  const diff = localDay(t, offset) - localDay(now.getTime(), offset);
  if (diff === 0) return '今天';
  if (diff === 1) return '明天';
  return `周${WEEKDAYS[new Date(t + offset).getUTCDay()]}`;
}

/** 从今天（城市当地）开始的每日预报 */
export const daysFrom = (forecast: Forecast, now: Date) =>
  forecast.days.filter((d) => localDay(d.time, forecast.offset) >= localDay(now.getTime(), forecast.offset));

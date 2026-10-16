// 天气：搜城市、取实况与预报（和风天气 v7，用户自己的 API Host 和 KEY），
// 以及和风的天气图标代码对应的图标、背景、时间的写法。
import { WEATHER } from '../config';
import { DAY, WEEKDAYS } from './date';
import { AppError } from './errors';
import { hasStrings } from './storage';

/** 和风天气的凭据：控制台里每个账号专属的 API Host（不带 https://）和 API KEY */
export type WeatherAccount = { host: string; key: string };
export const isWeatherAccount = hasStrings('host', 'key');

/** 选的城市。id 是和风的 LocationID；region：上级市、省份或国家，同名城市靠它区分 */
export type Place = { id: string; name: string; region: string; lat: number; lon: number };
export const isPlace = (v: unknown): v is Place =>
  hasStrings('id', 'name', 'region')(v) && typeof (v as Place).lat === 'number' && typeof (v as Place).lon === 'number';

/** 时间都是时间戳（毫秒）；offset 是城市所在时区的 UTC 偏移（毫秒），按城市当地时间写钟点和星期。code 是和风的图标代码 */
export type Forecast = {
  offset: number;
  current: { temp: number; feels: number; humidity: number; wind: number; code: number; text: string; day: boolean };
  hours: { time: number; temp: number; code: number; day: boolean }[];
  days: { time: number; code: number; max: number; min: number }[];
};

export type WeatherKind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder';

/** 背景能画的天气；晴、少云不用变 */
export type SceneWeather = 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow';
const SCENES: Partial<Record<WeatherKind, SceneWeather>> = {
  cloudy: 'cloudy',
  fog: 'fog',
  drizzle: 'drizzle',
  rain: 'rain',
  snow: 'snow',
  thunder: 'rain',
};
export const sceneOf = (kind: WeatherKind) => SCENES[kind] ?? null;

/** 背景跟随天气：写到 <html data-weather>，样式只看这个属性；null 是不跟随。 */
export function applySceneWeather(scene: SceneWeather | null) {
  if (scene) document.documentElement.dataset.weather = scene;
  else delete document.documentElement.dataset.weather;
}

/** 和风的图标代码对应哪种图标（见和风文档「天气图标」）：1xx 晴云、3xx 雨、4xx 雪、5xx 雾霾沙尘 */
export function kindOf(code: number): WeatherKind {
  if (code === 100 || code === 150) return 'clear';
  if (code <= 103 || (code >= 151 && code <= 153)) return 'partly';
  if (code === 104) return 'cloudy';
  if (code >= 300 && code < 400) return code === 309 ? 'drizzle' : code >= 302 && code <= 304 ? 'thunder' : 'rain';
  if (code >= 400 && code < 500) return 'snow';
  if (code >= 500 && code < 600) return 'fog';
  return 'partly';
}

/** 夜间的图标代码（晴、多云、阵雨、阵雪各有夜间版） */
const isNight = (code: number) => (code >= 150 && code <= 153) || code === 350 || code === 351 || code === 456 || code === 457;

/** 去掉用户粘贴时可能带上的 https:// 和结尾的 / */
export const normalizeHost = (host: string) =>
  host
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');

async function request(account: WeatherAccount, path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const url = `https://${account.host}${path}?${new URLSearchParams({ ...params, lang: 'zh' })}`;
  // fetch 只在连不上或超时的时候抛错；HTTP 错误码要自己判断。
  const response = await fetch(url, { headers: { 'X-QW-Api-Key': account.key }, signal: AbortSignal.timeout(WEATHER.timeout) }).catch(
    (cause) => {
      throw new AppError(cause.name === 'TimeoutError' ? '和风天气响应太慢，稍后会自动重试' : '连不上和风天气，检查网络或 API Host', {
        cause,
      });
    },
  );
  if (response.status === 401) throw new AppError('和风天气认证失败：检查 API KEY 和 API Host 是否填对');
  if (response.status === 403) throw new AppError('和风天气拒绝了请求：KEY 没有权限，或 API Host 不对');
  if (response.status === 429) throw new AppError('和风天气的请求次数用完了，稍后再试');
  if (!response.ok) throw new AppError(`和风天气返回错误（HTTP ${response.status}）`);
  const data = (await response.json()) as Record<string, unknown>;
  // 旧式的错误码放在返回内容里（HTTP 仍是 200）
  if (data.code === '402') throw new AppError('和风天气的请求次数用完或余额不足');
  if (data.code !== '200' && data.code !== '404') throw new AppError(`和风天气返回错误（${String(data.code)}）`);
  return data;
}

type RawPlace = { id: string; name: string; lat: string; lon: string; adm2: string; adm1: string; country: string };

/** 按名称搜城市，到区县一级；没找到是空数组。 */
export async function searchPlaces(account: WeatherAccount, name: string): Promise<Place[]> {
  const data = await request(account, WEATHER.api.lookup, { location: name, number: '10' });
  return ((data.location as RawPlace[] | undefined) ?? []).map((p) => {
    // 区县写上市和省，市只写省，国内不写国家。直辖市的区：上级是“北京”、省是“北京市”，只写一个。
    const city = p.adm2 === p.name ? '' : p.adm2;
    const province = city && p.adm1.startsWith(city) ? '' : p.adm1;
    const region = [city, province, p.country === '中国' ? '' : p.country].filter(Boolean).join('，');
    return { id: p.id, name: p.name, region, lat: Number(p.lat), lon: Number(p.lon) };
  });
}

type RawNow = { temp: string; feelsLike: string; humidity: string; windSpeed: string; icon: string; text: string };
type RawHour = { fxTime: string; temp: string; icon: string };
type RawDay = { fxDate: string; tempMax: string; tempMin: string; iconDay: string };

/** 实况、接下来 24 小时和 7 天。 */
export async function fetchForecast(account: WeatherAccount, place: Place): Promise<Forecast> {
  const location = { location: place.id };
  const [now, hourly, daily] = await Promise.all([
    request(account, WEATHER.api.now, location),
    request(account, WEATHER.api.hourly, location),
    request(account, WEATHER.api.daily, location),
  ]);
  const n = now.now as RawNow | undefined;
  const hours = hourly.hourly as RawHour[] | undefined;
  const days = daily.daily as RawDay[] | undefined;
  if (!n || !Array.isArray(hours) || !hours.length || !Array.isArray(days)) throw new AppError('和风天气没有这个城市的数据');
  // 时间带着城市的时区，例如 2026-10-16T20:00+08:00；按它算当地的钟点和日子。
  const zone = hours[0]!.fxTime.slice(-6);
  const [sign, hh, mm] = [zone[0] === '-' ? -1 : 1, Number(zone.slice(1, 3)), Number(zone.slice(4, 6))];
  const code = Number(n.icon);
  return {
    offset: sign * (hh * 60 + mm) * 60_000,
    current: {
      temp: Number(n.temp),
      feels: Number(n.feelsLike),
      humidity: Number(n.humidity),
      wind: Number(n.windSpeed),
      code,
      text: n.text,
      day: !isNight(code),
    },
    hours: hours.map((h) => ({ time: Date.parse(h.fxTime), temp: Number(h.temp), code: Number(h.icon), day: !isNight(Number(h.icon)) })),
    days: days.map((d) => ({
      time: Date.parse(`${d.fxDate}T00:00${zone}`),
      code: Number(d.iconDay),
      max: Number(d.tempMax),
      min: Number(d.tempMin),
    })),
  };
}

export const deg = (t: number) => `${Math.round(t)}°`;

/** 城市当地的第几天，用来比较是不是同一天 */
const localDay = (t: number, offset: number) => Math.floor((t + offset) / DAY);

/** 逐小时预报的钟点（城市当地时间） */
export const hourLabel = (t: number, offset: number) => `${new Date(t + offset).getUTCHours()}时`;

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

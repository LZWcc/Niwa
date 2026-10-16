// 世界时钟：各城市的当地时间、和本地差几小时，以及太阳直射点、某处现在是白天还是夜里（画地图的昼夜用）。不联网。
import { WORLD_CLOCK, type City } from '../config';
import { DAY, pad2, startOfDay } from './date';

export const CITY_BY_ID = new Map<string, City>(WORLD_CLOCK.cities.map((c) => [c.id, c]));

/** 时区在这一刻的 UTC 偏移（分钟），夏令时也算在内 */
export function zoneOffset(zone: string, at: Date) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' })
    .formatToParts(at)
    .find((p) => p.type === 'timeZoneName')!.value;
  const m = /([+-])(\d\d):(\d\d)/.exec(name); // UTC 本身写作 “GMT”，没有数字
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
}

/** 当地时间，例如 09:05 */
export const zoneTime = (zone: string, at: Date) =>
  new Intl.DateTimeFormat('zh-CN', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at);

/** 和本地相比：差几小时（“+8 小时”“−2:15 小时”“同一时间”），跨了一天时前面加“明天 / 昨天” */
export function zoneDiff(zone: string, at: Date) {
  const minutes = zoneOffset(zone, at) + at.getTimezoneOffset();
  const days = Math.round((startOfDay(at.getTime() + minutes * 60_000) - startOfDay(at.getTime())) / DAY);
  const abs = Math.abs(minutes);
  const hours =
    minutes === 0 ? '同一时间' : `${minutes > 0 ? '+' : '−'}${Math.floor(abs / 60)}${abs % 60 ? `:${pad2(abs % 60)}` : ''} 小时`;
  return days ? `${days > 0 ? '明天' : '昨天'} · ${hours}` : hours;
}

const RAD = Math.PI / 180;

/** 太阳直射点（纬度、经度，度）：按常用的近似公式，误差在一度以内，画昼夜够用 */
export function subsolar(t: number) {
  const d = (t - Date.UTC(2000, 0, 1, 12)) / DAY;
  const g = (357.529 + 0.98560028 * d) * RAD;
  const q = 280.459 + 0.98564736 * d;
  const l = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const e = (23.439 - 0.00000036 * d) * RAD;
  const lat = Math.asin(Math.sin(e) * Math.sin(l)) / RAD;
  const ra = Math.atan2(Math.cos(e) * Math.sin(l), Math.cos(l)) / RAD;
  // 均时差（换算成经度，度）：太阳实际过子午线比 12 点早或晚多少
  const eot = ((((q - ra) % 360) + 540) % 360) - 180;
  const utcHours = (((t % DAY) + DAY) % DAY) / 3_600_000;
  const lon = ((((-15 * (utcHours - 12) - eot) % 360) + 540) % 360) - 180;
  return { lat, lon };
}

/** 太阳高度角（度）：大于 0 是白天，-6 到 0 是晨昏 */
export function sunAltitude(lat: number, lon: number, sun: { lat: number; lon: number }) {
  const cos =
    Math.sin(lat * RAD) * Math.sin(sun.lat * RAD) + Math.cos(lat * RAD) * Math.cos(sun.lat * RAD) * Math.cos((lon - sun.lon) * RAD);
  return Math.asin(cos) / RAD;
}

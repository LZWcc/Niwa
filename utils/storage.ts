// 本地保存。所有数据都只在这台电脑的 localStorage 里，键统一在 KEYS 登记，都以 niwa: 开头。
// 字符串直接用 localStorage.getItem / setItem；JSON 用 readJson / writeJson，读出来的要校验。

export const KEYS = {
  /** 网格：快捷方式和小组件，各自带位置 */
  grid: 'niwa:grid',
  /** 快捷方式的图标图片：快捷方式 id → data URL */
  icons: 'niwa:icons',
  /** 「添加」格子的位置 */
  addTile: 'niwa:add',
  notes: 'niwa:notes',
  /** 已连接的日历（订阅地址相当于密码） */
  calendars: 'niwa:calendars',
  /** 日程的上一次结果，打开页面时先显示它 */
  calendarCache: 'niwa:calendar-cache',
  /** 打开过几天（庭随它生长） */
  visits: 'niwa:garden',
  /** 选中的搜索引擎名 */
  engine: 'niwa:engine',
  /** 浅色 / 深色：light、dark，没有或 system 表示跟随系统 */
  theme: 'niwa:theme',
  /** 收藏夹小组件上次看的文件夹 id（只对这个浏览器有效，不进备份） */
  bookmarkFolder: 'niwa:bookmark-folder',
  /** 历史小组件上次看的一组：recent、top、closed */
  historyTab: 'niwa:history-tab',
  /** 天气小组件选的城市 */
  weather: 'niwa:weather',
  /** 天气的上一次结果，打开页面时先显示它 */
  weatherCache: 'niwa:weather-cache',
} as const;

export type StorageKey = (typeof KEYS)[keyof typeof KEYS];

/** 读出 JSON 并校验；没有、解析失败（数据被改坏）或校验不过都返回 null。 */
export function readJson<T>(key: StorageKey, isValid: (value: unknown) => value is T): T | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    return isValid(value) ? value : null;
  } catch {
    return null;
  }
}

/** 读出一个列表：校验不过的项丢掉；没有存过时用 fallback。 */
export function readList<T>(key: StorageKey, isItem: (v: unknown) => v is T, fallback: T[]): T[] {
  return readJson(key, Array.isArray)?.filter(isItem) ?? fallback;
}

export const writeJson = (key: StorageKey, value: unknown) => localStorage.setItem(key, JSON.stringify(value));

/** 校验函数：对象且这些字段都是字符串。 */
export const hasStrings =
  <K extends string>(...keys: K[]) =>
  (v: unknown): v is Record<K, string> =>
    typeof v === 'object' && v !== null && keys.every((k) => typeof (v as Record<string, unknown>)[k] === 'string');

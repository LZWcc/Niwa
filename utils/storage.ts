// 本地保存。所有数据都只在这台电脑的 localStorage 里，键统一在 KEYS 登记，都以 niwa: 开头。
// 字符串直接用 localStorage.getItem / setItem；JSON 用 readJson / writeJson，读出来的要校验。

export const KEYS = {
  /** 网格：快捷方式和小组件，各自带位置 */
  grid: 'niwa:grid',
  /** 快捷方式的图标图片：快捷方式 id → data URL */
  icons: 'niwa:icons',
  /** 「添加」格子的位置 */
  addTile: 'niwa:add',
  /** 已连接的日历（订阅地址相当于密码，私密数据见 backup.ts 的 SECRETS） */
  calendars: 'niwa:calendars',
  /** 日程的上一次结果，打开页面时先显示它 */
  calendarCache: 'niwa:calendar-cache',
  /** 打开过几天（庭随它生长） */
  visits: 'niwa:garden',
  /** 选中的搜索引擎名 */
  engine: 'niwa:engine',
  /** 浅色 / 深色：light、dark，没有或 system 表示跟随系统 */
  theme: 'niwa:theme',
  /** 搜索框联想收藏和历史：off 表示关掉（默认开） */
  searchSuggest: 'niwa:search-suggest',
  /** 联想里排除的网站（域名列表，私密数据见 backup.ts 的 SECRETS） */
  searchExclude: 'niwa:search-exclude',
  /** 和风天气的 API Host 和 KEY（相当于密码，私密数据见 backup.ts 的 SECRETS） */
  weatherAccount: 'niwa:weather-account',
  /** 天气的上一次结果（按城市分开），打开页面时先显示它 */
  weatherCache: 'niwa:weather-forecast',
  /** 热榜的上一次结果（按来源分开），打开页面时先显示它 */
  hotlistCache: 'niwa:hotlist-cache',
  /** 订阅的上一次结果（按订阅地址分开），打开页面时先显示它 */
  feedCache: 'niwa:feed-cache',
  /** 计时器第一次开始倒计时时问过要不要发通知了：yes。只问一次，之后在菜单里开关 */
  timerNotifyAsked: 'niwa:timer-notify-asked',
  /** 背景是否跟随天气：on 表示跟随（天气小组件菜单里的开关，默认不跟随） */
  sceneWeather: 'niwa:scene-weather',
} as const;

export type StorageKey = (typeof KEYS)[keyof typeof KEYS];

/**
 * 旧版本每种小组件只能放一个，各自的数据单独存在这些键里；现在放在网格里每个小组件自己的 settings 里。
 * 页面启动时搬一次（utils/grid/migrate.ts），搬完删掉。
 */
export const LEGACY_KEYS = {
  notes: 'niwa:notes',
  weatherPlace: 'niwa:weather-city',
  bookmarkFolder: 'niwa:bookmark-folder',
  historyTab: 'niwa:history-tab',
} as const;

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

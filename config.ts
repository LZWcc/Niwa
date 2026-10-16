// 可以按需调整的配置：第三方服务、默认内容、调节参数、配色。改了要重新构建（pnpm dev 会自动重载）。
// 只放“换个值就行、不用改逻辑”的东西。和 CSS、交互手感绑在一起的常量（网格尺寸、拖动阈值、动画时长）
// 留在各自的代码旁边，不放这里，见 README「代码约定」。
import type { GridItem } from './utils/grid/items';

// ---------- 天气 ----------

/** 天气：Open-Meteo，免费、不需要 key，允许跨域请求（不用申请访问网站的权限）。只在选了城市后请求。 */
export const WEATHER = {
  /** 按名称搜城市 */
  geocode: 'https://geocoding-api.open-meteo.com/v1/search',
  forecast: 'https://api.open-meteo.com/v1/forecast',
  /** 多久在后台刷新一次（毫秒） */
  refreshEvery: 30 * 60_000,
  /** 更新失败后多久重试（毫秒） */
  retryAfter: 5 * 60_000,
  /** 一次请求最多等多久（毫秒） */
  timeout: 15_000,
};

// ---------- 搜索 ----------

export type SearchEngine = {
  name: string;
  /** 圆形标记里的图标：public/engines/ 下的文件名（不含 .svg），单色，按 color 着色 */
  icon: string;
  color: string;
  /** 表单用 GET 提交到 action，搜索词放在 param 参数里 */
  action: string;
  param: string;
};

/** 搜索引擎，第一个是默认的。用户选过的按 name 记住，改了 name 会回到默认。 */
export const SEARCH_ENGINES: SearchEngine[] = [
  { name: 'Google', icon: 'google', color: '#4285f4', action: 'https://www.google.com/search', param: 'q' },
  { name: 'Bing', icon: 'bing', color: '#108a8a', action: 'https://www.bing.com/search', param: 'q' },
  { name: '百度', icon: 'baidu', color: '#3245df', action: 'https://www.baidu.com/s', param: 'wd' },
  { name: 'DuckDuckGo', icon: 'duckduckgo', color: '#de5833', action: 'https://duckduckgo.com/', param: 'q' },
];

// ---------- 网格 ----------

/** 第一次打开时的快捷方式和小组件。不写位置，打开时按顺序补进空位；id 不重复就行。 */
export const DEFAULT_ITEMS: GridItem[] = [
  { id: 'notes', kind: 'widget', type: 'notes', size: 'm' },
  { id: 'garden', kind: 'widget', type: 'garden', size: 's' },
  { id: 'github', kind: 'link', name: 'GitHub', url: 'https://github.com/' },
  { id: 'wxt', kind: 'link', name: 'WXT', url: 'https://wxt.dev/' },
  { id: 'react', kind: 'link', name: 'React', url: 'https://react.dev/' },
  { id: 'mdn', kind: 'link', name: 'MDN', url: 'https://developer.mozilla.org/zh-CN/' },
];

// ---------- 快捷方式的图标 ----------

export type IconSource = {
  name: string;
  url: (domain: string) => string;
  /**
   * 查不到时有的服务不报错，而是返回一张生成的占位图，要认出来丢掉：
   * sha256：所有域名都返回同一张，按内容比对；cacheControl：占位图的 Cache-Control 有特征。
   * 查不到时返回 404 的服务不用写。
   */
  placeholder?: { sha256: string } | { cacheControl: RegExp };
};

export const ICONS = {
  /**
   * 第三方图标服务，按优先级排（网站自己声明的图标之后，排在前面的默认选中）。它们会知道添加了哪个域名。
   * 2026-10 在国内网络下实测：icon.horse（152–256px）、favicone（32 或 128px）直连可用，Google（128px）要走代理；
   * DuckDuckGo 大多只有 32px、Yandex 只有 16px，太糊，不用。
   */
  sources: [
    {
      name: 'icon.horse',
      url: (domain) => `https://icon.horse/icon/${domain}`,
      // 免费版的占位图按首字母生成、每个域名都不一样，只有 CDN 缓存时间特别短（5 分钟，真图标是 30 天）。服务变了要跟着改。
      placeholder: { cacheControl: /s-maxage=300\b/ },
    },
    { name: 'Google', url: (domain) => `https://www.google.com/s2/favicons?${new URLSearchParams({ domain, sz: '128' })}` },
    {
      name: 'favicone',
      url: (domain) => `https://favicone.com/${domain}?s=128`,
      placeholder: { sha256: '7b4142212706d008a65036f8993385a8371f321c656bdba5b4f3e00e5721dc77' },
    },
  ] satisfies IconSource[] as IconSource[],
  /** 每个来源最多等多久（毫秒）；各来源同时请求，一个慢不耽误别的 */
  timeout: 8000,
  /** 原图边长小于这个就太糊了，不作候选（58px 的图标在 2 倍屏上要 116px） */
  minSize: 48,
  /** 网站自己声明的图标最多取几张（常见的是同一个标志的不同尺寸） */
  ownMax: 2,
  /** 网址停止变化多久之后再去获取（毫秒），不必每敲一个字就请求一次 */
  debounce: 500,
  /** 文字图标可选的背景色；默认的颜色按网站从这里挑 */
  textColors: ['#4f86c6', '#3fa7a3', '#5aa469', '#d9853b', '#c9504b', '#b05fa6', '#6a6fc4', '#56636e'],
};

// ---------- 日程 ----------

export const CALENDAR = {
  /** 多久在后台刷新一次（毫秒）；月历留在内存里的解析结果也按这个过期 */
  refreshEvery: 15 * 60_000,
  /** 有日历更新失败时，多久后重试（毫秒） */
  retryAfter: 2 * 60_000,
  /** 小组件取多少天的日程 */
  days: 14,
  /** 下载一个日历最多等多久（毫秒） */
  timeout: 15_000,
  /** 新加的日历依次用这些颜色 */
  colors: ['#4f86c6', '#d9853b', '#5aa469', '#b05fa6', '#c9504b', '#3fa7a3'],
  /** Google 日历：添加日历说明里的设置页；详情里“在 Google 日历中打开”那一天 */
  google: {
    host: 'calendar.google.com',
    settings: 'https://calendar.google.com/calendar/r/settings',
    dayView: (date: Date) => `https://calendar.google.com/calendar/r/day/${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`,
  },
};

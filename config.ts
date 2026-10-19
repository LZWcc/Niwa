// 可以按需调整的配置：第三方服务、默认内容、调节参数、配色。改了要重新构建（pnpm dev 会自动重载）。
// 只放“换个值就行、不用改逻辑”的东西。和 CSS、交互手感绑在一起的常量（网格尺寸、拖动阈值、动画时长）
// 留在各自的代码旁边，不放这里，见 docs/DEVELOPMENT.md「代码约定」。
import type { GridItem } from './utils/grid/items';

// ---------- 天气 ----------

/**
 * 天气：和风天气（国内的地名和预报都准）。用户在控制台申请免费的 API KEY，连同账号专属的 API Host 填进小组件。
 * 和风允许跨域请求，不用申请访问网站的权限。只在选了城市后请求。
 */
export const WEATHER = {
  /** 和风天气控制台：注册、建项目拿 KEY、在设置里看 API Host */
  console: 'https://console.qweather.com',
  /** 接口路径（拼在 API Host 后面）：城市搜索、实况、逐小时、逐天 */
  api: { lookup: '/geo/v2/city/lookup', now: '/v7/weather/now', hourly: '/v7/weather/24h', daily: '/v7/weather/7d' },
  /** 多久刷新一次（毫秒）：每次要请求三个接口（实况、逐小时、逐天），和风的免费额度有限，天气也变得没那么快 */
  refreshEvery: 60 * 60_000,
  /** 更新失败后多久重试（毫秒） */
  retryAfter: 5 * 60_000,
  /** 一次请求最多等多久（毫秒） */
  timeout: 15_000,
  /** 背景跟随天气：数据旧过这么久（比如电脑睡了一晚）就先不跟随，等刷新（毫秒） */
  sceneMaxAge: 3 * 3_600_000,
};

// ---------- 热榜 ----------

/** 热榜的来源。id 对应 utils/hotlist.ts 里的解析规则；login：要在这个浏览器里登录那个网站才拿得到（请求时带上登录状态） */
export type HotSource = { id: 'zhihu' | 'weibo' | 'bilibili' | 'baidu' | 'toutiao' | 'juejin'; name: string; url: string; login?: boolean };

/**
 * 热榜：各网站自己网页上用的接口，不是公开的 API，随时可能变（变了改这里的地址和 utils/hotlist.ts 的解析）。
 * 都不允许跨域，要有访问那个网站的权限（添加、换来源时申请）。2026-10 在国内网络下验证过，微博不登录会被拒绝。
 */
export const HOTLIST = {
  sources: [
    { id: 'zhihu', name: '知乎', url: 'https://api.zhihu.com/topstory/hot-lists/total?limit=50' },
    { id: 'weibo', name: '微博', url: 'https://weibo.com/ajax/side/hotSearch', login: true },
    { id: 'bilibili', name: 'B 站', url: 'https://api.bilibili.com/x/web-interface/popular?ps=50&pn=1' },
    { id: 'baidu', name: '百度', url: 'https://top.baidu.com/api/board?platform=wise&tab=realtime' },
    { id: 'toutiao', name: '头条', url: 'https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc' },
    { id: 'juejin', name: '掘金', url: 'https://api.juejin.cn/content_api/v1/content/article_rank?category_id=1&type=hot' },
  ] satisfies HotSource[],
  /** 多久刷新一次（毫秒），只有正在看的标签页去取 */
  refreshEvery: 30 * 60_000,
  /** 失败后多久重试（毫秒） */
  retryAfter: 5 * 60_000,
  /** 一次请求最多等多久（毫秒） */
  timeout: 10_000,
};

// ---------- 订阅 ----------

/**
 * 订阅（RSS / Atom）：用户自己填的博客、网站。订阅地址各不相同，添加时按需申请访问那个网站的权限（只支持 https）。
 * 和热榜一样省请求：只有正在看的标签页去取，缓存按订阅地址分开、各标签页共用。
 */
export const FEEDS = {
  /** 一个订阅小组件最多几个订阅 */
  max: 30,
  /** 每个订阅最多留几篇（最新的） */
  itemsPerFeed: 50,
  /** 大面板里摘要最多几个字 */
  summaryLength: 200,
  /** 多久刷新一次（毫秒），只有正在看的标签页去取 */
  refreshEvery: 30 * 60_000,
  /** 失败后多久重试（毫秒） */
  retryAfter: 5 * 60_000,
  /** 一次请求最多等多久（毫秒） */
  timeout: 15_000,
};

// ---------- 世界时钟 ----------

/** 世界时钟可选的城市：id、中文名、英文名（搜索用）、IANA 时区、大致的纬度和经度（地图上的标记） */
export type City = { id: string; name: string; en: string; zone: string; lat: number; lon: number };

export const WORLD_CLOCK = {
  /** 刚加上时显示的城市 */
  defaults: ['london', 'newyork', 'tokyo'],
  /** 最多放几个城市 */
  max: 8,
  cities: [
    { id: 'beijing', name: '北京', en: 'Beijing', zone: 'Asia/Shanghai', lat: 39.9, lon: 116.4 },
    { id: 'shanghai', name: '上海', en: 'Shanghai', zone: 'Asia/Shanghai', lat: 31.2, lon: 121.5 },
    { id: 'hongkong', name: '香港', en: 'Hong Kong', zone: 'Asia/Hong_Kong', lat: 22.3, lon: 114.2 },
    { id: 'taipei', name: '台北', en: 'Taipei', zone: 'Asia/Taipei', lat: 25.0, lon: 121.5 },
    { id: 'tokyo', name: '东京', en: 'Tokyo', zone: 'Asia/Tokyo', lat: 35.7, lon: 139.7 },
    { id: 'seoul', name: '首尔', en: 'Seoul', zone: 'Asia/Seoul', lat: 37.6, lon: 127.0 },
    { id: 'singapore', name: '新加坡', en: 'Singapore', zone: 'Asia/Singapore', lat: 1.3, lon: 103.8 },
    { id: 'kualalumpur', name: '吉隆坡', en: 'Kuala Lumpur', zone: 'Asia/Kuala_Lumpur', lat: 3.1, lon: 101.7 },
    { id: 'bangkok', name: '曼谷', en: 'Bangkok', zone: 'Asia/Bangkok', lat: 13.8, lon: 100.5 },
    { id: 'hanoi', name: '河内', en: 'Hanoi', zone: 'Asia/Ho_Chi_Minh', lat: 21.0, lon: 105.8 },
    { id: 'jakarta', name: '雅加达', en: 'Jakarta', zone: 'Asia/Jakarta', lat: -6.2, lon: 106.8 },
    { id: 'manila', name: '马尼拉', en: 'Manila', zone: 'Asia/Manila', lat: 14.6, lon: 121.0 },
    { id: 'newdelhi', name: '新德里', en: 'New Delhi', zone: 'Asia/Kolkata', lat: 28.6, lon: 77.2 },
    { id: 'mumbai', name: '孟买', en: 'Mumbai', zone: 'Asia/Kolkata', lat: 19.1, lon: 72.9 },
    { id: 'kathmandu', name: '加德满都', en: 'Kathmandu', zone: 'Asia/Kathmandu', lat: 27.7, lon: 85.3 },
    { id: 'dhaka', name: '达卡', en: 'Dhaka', zone: 'Asia/Dhaka', lat: 23.8, lon: 90.4 },
    { id: 'karachi', name: '卡拉奇', en: 'Karachi', zone: 'Asia/Karachi', lat: 24.9, lon: 67.0 },
    { id: 'ulaanbaatar', name: '乌兰巴托', en: 'Ulaanbaatar', zone: 'Asia/Ulaanbaatar', lat: 47.9, lon: 106.9 },
    { id: 'dubai', name: '迪拜', en: 'Dubai', zone: 'Asia/Dubai', lat: 25.2, lon: 55.3 },
    { id: 'tehran', name: '德黑兰', en: 'Tehran', zone: 'Asia/Tehran', lat: 35.7, lon: 51.4 },
    { id: 'riyadh', name: '利雅得', en: 'Riyadh', zone: 'Asia/Riyadh', lat: 24.7, lon: 46.7 },
    { id: 'istanbul', name: '伊斯坦布尔', en: 'Istanbul', zone: 'Europe/Istanbul', lat: 41.0, lon: 29.0 },
    { id: 'moscow', name: '莫斯科', en: 'Moscow', zone: 'Europe/Moscow', lat: 55.8, lon: 37.6 },
    { id: 'cairo', name: '开罗', en: 'Cairo', zone: 'Africa/Cairo', lat: 30.0, lon: 31.2 },
    { id: 'nairobi', name: '内罗毕', en: 'Nairobi', zone: 'Africa/Nairobi', lat: -1.3, lon: 36.8 },
    { id: 'lagos', name: '拉各斯', en: 'Lagos', zone: 'Africa/Lagos', lat: 6.5, lon: 3.4 },
    { id: 'johannesburg', name: '约翰内斯堡', en: 'Johannesburg', zone: 'Africa/Johannesburg', lat: -26.2, lon: 28.0 },
    { id: 'london', name: '伦敦', en: 'London', zone: 'Europe/London', lat: 51.5, lon: -0.1 },
    { id: 'dublin', name: '都柏林', en: 'Dublin', zone: 'Europe/Dublin', lat: 53.3, lon: -6.3 },
    { id: 'paris', name: '巴黎', en: 'Paris', zone: 'Europe/Paris', lat: 48.9, lon: 2.4 },
    { id: 'berlin', name: '柏林', en: 'Berlin', zone: 'Europe/Berlin', lat: 52.5, lon: 13.4 },
    { id: 'amsterdam', name: '阿姆斯特丹', en: 'Amsterdam', zone: 'Europe/Amsterdam', lat: 52.4, lon: 4.9 },
    { id: 'madrid', name: '马德里', en: 'Madrid', zone: 'Europe/Madrid', lat: 40.4, lon: -3.7 },
    { id: 'rome', name: '罗马', en: 'Rome', zone: 'Europe/Rome', lat: 41.9, lon: 12.5 },
    { id: 'zurich', name: '苏黎世', en: 'Zurich', zone: 'Europe/Zurich', lat: 47.4, lon: 8.5 },
    { id: 'stockholm', name: '斯德哥尔摩', en: 'Stockholm', zone: 'Europe/Stockholm', lat: 59.3, lon: 18.1 },
    { id: 'reykjavik', name: '雷克雅未克', en: 'Reykjavik', zone: 'Atlantic/Reykjavik', lat: 64.1, lon: -21.9 },
    { id: 'newyork', name: '纽约', en: 'New York', zone: 'America/New_York', lat: 40.7, lon: -74.0 },
    { id: 'toronto', name: '多伦多', en: 'Toronto', zone: 'America/Toronto', lat: 43.7, lon: -79.4 },
    { id: 'chicago', name: '芝加哥', en: 'Chicago', zone: 'America/Chicago', lat: 41.9, lon: -87.6 },
    { id: 'denver', name: '丹佛', en: 'Denver', zone: 'America/Denver', lat: 39.7, lon: -105.0 },
    { id: 'losangeles', name: '洛杉矶', en: 'Los Angeles', zone: 'America/Los_Angeles', lat: 34.1, lon: -118.2 },
    { id: 'sanfrancisco', name: '旧金山', en: 'San Francisco', zone: 'America/Los_Angeles', lat: 37.8, lon: -122.4 },
    { id: 'seattle', name: '西雅图', en: 'Seattle', zone: 'America/Los_Angeles', lat: 47.6, lon: -122.3 },
    { id: 'vancouver', name: '温哥华', en: 'Vancouver', zone: 'America/Vancouver', lat: 49.3, lon: -123.1 },
    { id: 'anchorage', name: '安克雷奇', en: 'Anchorage', zone: 'America/Anchorage', lat: 61.2, lon: -149.9 },
    { id: 'honolulu', name: '檀香山', en: 'Honolulu', zone: 'Pacific/Honolulu', lat: 21.3, lon: -157.9 },
    { id: 'mexicocity', name: '墨西哥城', en: 'Mexico City', zone: 'America/Mexico_City', lat: 19.4, lon: -99.1 },
    { id: 'saopaulo', name: '圣保罗', en: 'São Paulo', zone: 'America/Sao_Paulo', lat: -23.6, lon: -46.6 },
    { id: 'buenosaires', name: '布宜诺斯艾利斯', en: 'Buenos Aires', zone: 'America/Argentina/Buenos_Aires', lat: -34.6, lon: -58.4 },
    { id: 'lima', name: '利马', en: 'Lima', zone: 'America/Lima', lat: -12.0, lon: -77.0 },
    { id: 'sydney', name: '悉尼', en: 'Sydney', zone: 'Australia/Sydney', lat: -33.9, lon: 151.2 },
    { id: 'melbourne', name: '墨尔本', en: 'Melbourne', zone: 'Australia/Melbourne', lat: -37.8, lon: 145.0 },
    { id: 'perth', name: '珀斯', en: 'Perth', zone: 'Australia/Perth', lat: -31.95, lon: 115.9 },
    { id: 'auckland', name: '奥克兰', en: 'Auckland', zone: 'Pacific/Auckland', lat: -36.8, lon: 174.8 },
  ] satisfies City[],
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

/**
 * 第一次打开时的快捷方式和小组件（左上 4×2 的快捷方式，右边世界时钟、庭，下面便签）；id 不重复就行。
 * 只放打开就能用的小组件（天气、日程要先填 KEY、订阅地址，不放）。快捷方式用打包在扩展里的图片图标：
 * utils/icons/defaults.ts，改了这里的快捷方式要运行 pnpm default-icons 重新生成，第一次打开时由 main.tsx 写进 niwa:icons。
 */
export const DEFAULT_ITEMS: GridItem[] = [
  { id: 'github', kind: 'link', name: 'GitHub', url: 'https://github.com/', icon: { kind: 'image' }, x: 0, y: 0 },
  { id: 'youtube', kind: 'link', name: 'YouTube', url: 'https://www.youtube.com/', icon: { kind: 'image' }, x: 1, y: 0 },
  { id: 'x', kind: 'link', name: 'X', url: 'https://x.com/', icon: { kind: 'image' }, x: 2, y: 0 },
  { id: 'chatgpt', kind: 'link', name: 'ChatGPT', url: 'https://chatgpt.com/', icon: { kind: 'image' }, x: 3, y: 0 },
  { id: 'zhihu', kind: 'link', name: '知乎', url: 'https://www.zhihu.com/', icon: { kind: 'image' }, x: 0, y: 1 },
  { id: 'xiaohongshu', kind: 'link', name: '小红书', url: 'https://www.xiaohongshu.com/', icon: { kind: 'image' }, x: 1, y: 1 },
  { id: 'weread', kind: 'link', name: '微信读书', url: 'https://weread.qq.com/', icon: { kind: 'image' }, x: 2, y: 1 },
  { id: 'notion', kind: 'link', name: 'Notion', url: 'https://www.notion.so/', icon: { kind: 'image' }, x: 3, y: 1 },
  { id: 'worldclock', kind: 'widget', type: 'worldclock', size: 'm', x: 4, y: 0 },
  { id: 'garden', kind: 'widget', type: 'garden', size: 's', x: 8, y: 0 },
  { id: 'figma', kind: 'link', name: 'Figma', url: 'https://www.figma.com/', icon: { kind: 'image' }, x: 10, y: 0 },
  { id: 'notes', kind: 'widget', type: 'notes', size: 'm', x: 4, y: 2 },
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
  /** 导入的 .ics 文件最大多少（字节）：存在 IndexedDB 里，从别的日历整个导出的可能有好几年的日程 */
  maxFileSize: 5 * 1024 * 1024,
  /** 新加的日历依次用这些颜色 */
  colors: ['#4f86c6', '#d9853b', '#5aa469', '#b05fa6', '#c9504b', '#3fa7a3'],
  /** Google 日历：添加日历说明里的设置页；详情里“在 Google 日历中打开”那一天 */
  google: {
    host: 'calendar.google.com',
    settings: 'https://calendar.google.com/calendar/r/settings',
    dayView: (date: Date) => `https://calendar.google.com/calendar/r/day/${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`,
  },
};

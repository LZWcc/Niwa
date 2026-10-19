// 小组件库预览用的演示数据（见 hooks/useSample.ts）。时间都按 now 现算，什么时候打开都像刚取到的。

import { CALENDAR } from '@/config';
import type { FeedEntry } from '@/hooks/useFeeds';
import type { Page } from '@/hooks/useBrowsingHistory';
import type { BookmarkNode, HistoryTab } from './browsing';
import type { CalendarEvent, CalendarSource } from './calendar/ical';
import { DAY, dayKey, startOfDay } from './date';
import type { WidgetSettings } from './grid/items';
import type { HotItem } from './hotlist';
import type { Visits } from './visits';
import type { Forecast, Place, WeatherAccount } from './weather';
import type { WidgetType } from './widgets';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export const SAMPLE_CALENDAR: CalendarSource = { id: 'sample', url: 'sample:', name: '生活', color: CALENDAR.colors[0]! };

/** 接下来几天的日程：第一个在一小时内开始 */
export function sampleEvents(now: Date): CalendarEvent[] {
  const today = startOfDay(now.getTime());
  const soon = Math.ceil(now.getTime() / (30 * MINUTE)) * 30 * MINUTE + 30 * MINUTE;
  const event = (title: string, start: number, minutes: number, allDay = false): CalendarEvent => ({
    id: title,
    title,
    start,
    end: start + minutes * MINUTE,
    allDay,
    source: SAMPLE_CALENDAR.id,
  });
  return [
    event('周会', soon, 60),
    event('读书会', today + DAY + 10 * HOUR, 90),
    event('妈妈生日', today + 2 * DAY, 24 * 60, true),
    event('和朋友吃饭', today + 2 * DAY + 12 * HOUR, 90),
    event('牙医复诊', today + 4 * DAY + 15 * HOUR, 60),
  ];
}

export const SAMPLE_ACCOUNT: WeatherAccount = { host: 'sample', key: 'sample' };
export const SAMPLE_PLACE: Place = { id: 'sample', name: '杭州', region: '浙江省', lat: 30.25, lon: 120.21 };

export function sampleForecast(now: Date): Forecast {
  const hour = Math.floor(now.getTime() / HOUR) * HOUR;
  const today = startOfDay(now.getTime());
  const days: [number, number, number, string][] = [
    [101, 21, 13, '多云'],
    [100, 23, 14, '晴'],
    [305, 19, 14, '小雨'],
    [104, 18, 12, '阴'],
    [100, 22, 12, '晴'],
    [100, 23, 13, '晴'],
    [101, 21, 14, '多云'],
  ];
  return {
    offset: -now.getTimezoneOffset() * MINUTE,
    current: { temp: 18, feels: 17, humidity: 64, wind: 9, code: 101, text: '多云', day: true },
    hours: [17, 17, 16, 15, 14, 14, 13, 13].map((temp, i) => ({ time: hour + (i + 1) * HOUR, temp, code: i < 2 ? 101 : 100, day: true })),
    days: days.map(([code, max, min, text], i) => ({ time: today + i * DAY, code, max, min, text })),
  };
}

export const SAMPLE_HOT: HotItem[] = [
  ['霜降到了，各地陆续迎来降温', '412 万热度'],
  ['有哪些让你相见恨晚的效率工具？', '356 万热度'],
  ['秋天的第一顿火锅', '298 万热度'],
  ['城市公园里的银杏开始变黄', '201 万热度'],
  ['怎样培养一个能长期坚持的爱好？', '187 万热度'],
  ['周末短途出行去哪儿', '143 万热度'],
  ['一个人做饭，怎样简单又好吃', '120 万热度'],
  ['为什么秋天的天空特别蓝？', '98 万热度'],
].map(([title, hot], i) => ({ title: title!, hot, url: `#sample-${i}` }));

const SAMPLE_FEED = { id: 'sample', url: 'sample:feed' };

export function sampleFeedEntries(now: Date): Record<string, FeedEntry> {
  const titles = [
    '把新标签页变成一方小庭院',
    '二十四节气与七十二候',
    '我的效率工具清单',
    '慢慢来，比较快',
    '写给自己的周报模板',
    '在家做一杯手冲咖啡',
  ];
  const items = titles.map((title, i) => ({ title, url: `#sample-${i}`, time: now.getTime() - (i * 7 + 2) * HOUR }));
  return { [SAMPLE_FEED.url]: { fetchedAt: now.getTime(), content: { title: '示例博客', items }, error: null } };
}

/** 收藏夹：收藏夹栏里两个文件夹和几个网站 */
const node = (id: string, title: string, rest: { url: string } | { children: BookmarkNode[] }): BookmarkNode =>
  ({ id, title, syncing: false, ...rest }) as BookmarkNode;
const site = (id: string, title: string, host: string) => node(id, title, { url: `https://${host}/` });
export const SAMPLE_BOOKMARKS = node('0', '', {
  children: [
    node('1', '收藏夹栏', {
      children: [
        node('10', '工作', { children: [site('11', 'Gmail', 'mail.google.com'), site('12', 'Notion', 'www.notion.so')] }),
        node('20', '阅读', { children: [site('21', '少数派', 'sspai.com'), site('22', '微信读书', 'weread.qq.com')] }),
        site('30', 'GitHub', 'github.com'),
        site('31', 'MDN', 'developer.mozilla.org'),
        site('32', '维基百科', 'zh.wikipedia.org'),
        site('33', '豆瓣', 'www.douban.com'),
        site('34', 'YouTube', 'www.youtube.com'),
        site('35', 'Figma', 'www.figma.com'),
      ],
    }),
  ],
});

const SITES = [
  ['GitHub', 'github.com'],
  ['少数派', 'sspai.com'],
  ['知乎', 'www.zhihu.com'],
  ['YouTube', 'www.youtube.com'],
  ['MDN', 'developer.mozilla.org'],
  ['维基百科', 'zh.wikipedia.org'],
  ['豆瓣', 'www.douban.com'],
  ['Figma', 'www.figma.com'],
] as const;

export function samplePages(tab: HistoryTab, now: Date): Page[] {
  const pages = SITES.map(([title, host]) => ({ key: host, url: `https://${host}/`, title }));
  if (tab === 'top') return pages;
  if (tab === 'closed') return pages.slice(2, 5).map((p, i) => ({ ...p, time: now.getTime() - (i + 1) * 9 * MINUTE, session: p.key }));
  return pages.map((p, i) => ({ ...p, time: now.getTime() - (i * i + 1) * 4 * MINUTE }));
}

export const sampleVisits = (now: Date): Visits => ({ first: '2026-01-01', last: dayKey(now), days: 30 });

/** 各种小组件预览时的设置：便签的内容、天气的城市、走着的计时器、订阅 */
export function sampleSettings(type: WidgetType, now: number): WidgetSettings {
  const settings: Partial<Record<WidgetType, WidgetSettings>> = {
    notes: {
      notes: [
        { id: '1', text: '周五前交季度总结' },
        { id: '2', text: '买菜：番茄、鸡蛋、青菜' },
        { id: '3', text: '给妈妈打电话' },
      ],
    },
    weather: { place: SAMPLE_PLACE },
    timer: { timer: { mode: 'countdown', duration: 25 * MINUTE, elapsed: 0, startedAt: now - 7 * MINUTE - 23_000 } },
    feeds: { feeds: [SAMPLE_FEED] },
  };
  return settings[type] ?? {};
}

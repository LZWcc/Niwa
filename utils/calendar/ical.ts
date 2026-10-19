// 读取日程：日历的 iCal 订阅地址（如 Google 日历的“iCal 格式的私密地址”），或者导入的 .ics 文件。
// 只读、无需登录；订阅地址本身就是凭证，只保存在本机。导入的文件存在 IndexedDB（files.ts），不会自动更新。

import { CALENDAR } from '../../config';
import { DAY } from '../date';
import { AppError } from '../errors';
import { hasStrings } from '../storage';
import { readCalendarFile } from './files';

/** url：订阅地址；导入的文件是 file:<随机串>（每次导入换一个，缓存跟着失效），内容按 id 存在 IndexedDB */
export type CalendarSource = { id: string; url: string; name: string; color: string };
export const isCalendarSource = hasStrings('id', 'url', 'name', 'color');
export type CalendarEvent = {
  id: string;
  title: string;
  start: number;
  end: number;
  allDay: boolean;
  source: string;
  location?: string;
  description?: string;
  /** 视频会议链接：日程的会议属性，或地点本身就是一个网址 */
  conference?: string;
};

// 很久以前开始的重复日程需要从头展开，设个上限防止异常数据卡住页面。
const MAX_OCCURRENCES = 20_000;

/** 按开始时间排；同一时刻全天的排在前面。 */
export const byStart = (a: CalendarEvent, b: CalendarEvent) => a.start - b.start || Number(b.allDay) - Number(a.allDay);

export const isFileSource = (source: CalendarSource) => source.url.startsWith('file:');

/** webcal:// 换成 https://；无效时返回 null。 */
export function normalizeCalendarUrl(input: string): string | null {
  const value = input.trim().replace(/^webcal:\/\//i, 'https://');
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

/** Google 日历的描述可能是 HTML：换行标签转成换行，其余标签去掉，只留纯文本。 */
function plainText(value: unknown, limit = 2000) {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  let text = value;
  if (/<[a-z][\s\S]*>/i.test(text)) {
    const html = text.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h\d)>/gi, '\n');
    // DOMParser 解析出的文档是惰性的，不会执行脚本或加载资源。
    text = new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '';
  }
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  return text.length > limit ? `${text.slice(0, limit)}…` : text || undefined;
}

type ParsedCalendar = { name?: string; expand: (from: number, until: number) => CalendarEvent[] };

/** 下载订阅地址的内容 */
async function fetchText(url: string) {
  // fetch 只在连不上（断网、代理、没给网站权限）或超时的时候抛错；HTTP 错误码要自己判断。
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(CALENDAR.timeout) }).catch((cause) => {
    throw new AppError(cause.name === 'TimeoutError' ? '日历网站响应太慢，稍后会自动重试' : '连不上日历所在的网站，检查网络或代理', {
      cause,
    });
  });
  if (response.status === 404) throw new AppError('日历地址已失效，请重新复制私密地址');
  if (!response.ok) throw new AppError(`日历网站返回错误（HTTP ${response.status}）`);
  return response.text();
}

/** 取到日历的内容（下载订阅地址，或读导入的文件）并解析 */
async function download(source: CalendarSource): Promise<ParsedCalendar> {
  if (!isFileSource(source)) return parse(source.id, await fetchText(source.url), '这个地址返回的不是日历（.ics）');
  const text = await readCalendarFile(source.id);
  if (text === undefined) throw new AppError('这个日历文件不在这台电脑上，请重新导入');
  return parse(source.id, text, '这个文件不是日历（.ics）');
}

/** 导入 .ics 文件前先解析一遍：不是日历时抛 AppError；返回日历自带的名称（没有时是 undefined） */
export async function calendarName(text: string) {
  return (await parse('', text, '这个文件不是日历（.ics）')).name;
}

/** 解析一个日历；返回的 expand 可以反复展开任意时间段（重复日程逐次展开）。sourceId 记在每个日程上 */
async function parse(sourceId: string, text: string, notCalendar: string): Promise<ParsedCalendar> {
  // 解析库只在需要时加载，不拖慢新标签页的首屏。
  const { default: ICAL } = await import('ical.js');
  const read = () => {
    try {
      return new ICAL.Component(ICAL.parse(text));
    } catch (cause) {
      throw new AppError(notCalendar, { cause });
    }
  };
  const root = read();
  // 能解析但不是日历（比如通讯录 vCard）
  if (root.name !== 'vcalendar') throw new AppError(notCalendar);
  for (const tz of root.getAllSubcomponents('vtimezone')) ICAL.TimezoneService.register(tz);

  const all = root.getAllSubcomponents('vevent').map((c) => new ICAL.Event(c));

  // 单次改期/改名的日程（RECURRENCE-ID）挂到所属的重复日程上，展开时自动替换。
  const masters = new Map<string, InstanceType<typeof ICAL.Event>>();
  for (const e of all) if (!e.isRecurrenceException()) masters.set(e.uid, e);
  for (const e of all) if (e.isRecurrenceException()) masters.get(e.uid)?.relateException(e);

  const expand = (from: number, until: number) => {
    const events: CalendarEvent[] = [];
    const push = (
      item: InstanceType<typeof ICAL.Event>,
      startTime: InstanceType<typeof ICAL.Time>,
      endTime: InstanceType<typeof ICAL.Time>,
    ) => {
      if (item.component.getFirstPropertyValue('status') === 'CANCELLED') return;
      const allDay = startTime.isDate;
      const start = startTime.toJSDate().getTime();
      let end = endTime.toJSDate().getTime();
      if (end <= start) end = start + (allDay ? DAY : 0);
      if (end <= from || start >= until) return;
      const location = plainText(item.location, 300);
      const description = plainText(item.description);
      // 视频会议链接：Google 的 X-GOOGLE-CONFERENCE，标准的 CONFERENCE，或者地点本身就是一个网址。
      const conference =
        plainText(item.component.getFirstPropertyValue('x-google-conference'), 300) ??
        plainText(item.component.getFirstPropertyValue('conference'), 300) ??
        (/^https?:\/\/\S+$/i.test(location ?? '') ? location : undefined);
      events.push({
        id: `${sourceId}:${item.uid}:${start}`,
        title: item.summary || '（无标题）',
        start,
        end,
        allDay,
        source: sourceId,
        location,
        description,
        conference,
      });
    };

    for (const e of all) {
      if (e.isRecurrenceException() && masters.has(e.uid)) continue;
      if (!e.isRecurring()) {
        push(e, e.startDate, e.endDate);
        continue;
      }
      const it = e.iterator();
      for (let n = 0, next = it.next(); next && n < MAX_OCCURRENCES; n++, next = it.next()) {
        const details = e.getOccurrenceDetails(next);
        if (details.startDate.toJSDate().getTime() >= until) break;
        push(details.item, details.startDate, details.endDate);
      }
    }
    return events.sort(byStart);
  };

  const name = root.getFirstPropertyValue('x-wr-calname');
  return { name: typeof name === 'string' ? name : undefined, expand };
}

// 解析结果留在内存里：月历翻页时不必重新下载。
const memory = new Map<string, { at: number; calendar: Promise<ParsedCalendar> }>();

/** 取一个日历的解析结果；内存里的超过 maxAge 就重新下载。 */
export function loadCalendar(source: CalendarSource, maxAge = CALENDAR.refreshEvery) {
  const hit = memory.get(source.url);
  if (hit && Date.now() - hit.at < maxAge) return hit.calendar;
  const calendar = download(source);
  memory.set(source.url, { at: Date.now(), calendar });
  calendar.catch(() => memory.delete(source.url));
  return calendar;
}

/** 重新下载一个日历，返回从 from 起 days 天内的日程（小组件刷新用）。 */
export async function fetchCalendar(source: CalendarSource, from: number, days: number) {
  const calendar = await loadCalendar(source, 0);
  return { name: calendar.name, events: calendar.expand(from, from + days * DAY) };
}

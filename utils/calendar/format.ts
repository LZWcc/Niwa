// 日程的时间、日期、地点怎么显示：小组件、月历、详情共用。
import { CALENDAR } from '../../config';
import { DAY, WEEKDAYS, pad2, startOfDay } from '../date';
import type { CalendarEvent, CalendarSource } from './ical';

export const hm = (t: number) => {
  const d = new Date(t);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

export const fullDate = (t: number) => {
  const d = new Date(t);
  return `${d.getMonth() + 1}月${d.getDate()}日 周${WEEKDAYS[d.getDay()]}`;
};

export function dayLabel(t: number, now: Date) {
  const diff = Math.round((startOfDay(t) - startOfDay(now.getTime())) / DAY);
  if (diff <= 0) return '今天';
  if (diff === 1) return '明天';
  if (diff === 2) return '后天';
  return fullDate(t);
}

export function timeLabel(e: CalendarEvent, now: Date) {
  if (e.allDay) return '全天';
  if (e.start <= now.getTime()) return `进行中 · 至 ${hm(e.end)}`;
  return `${hm(e.start)} – ${hm(e.end)}`;
}

/** Google 日历那一天的视图；其他来源没有网页可跳。 */
export function dayLink(e: CalendarEvent, source: CalendarSource | undefined) {
  if (!source?.url.includes(CALENDAR.google.host)) return undefined;
  return CALENDAR.google.dayView(new Date(e.start));
}

/** 中尺寸用的单行时间：今天只写时刻，其他天加上“明天”“周六”等。 */
export function shortTime(e: CalendarEvent, now: Date) {
  const day = dayLabel(e.start, now);
  const prefix = day === '今天' ? '' : `${day.replace(/^\d+月\d+日 /, '')} `;
  if (e.allDay) return `${prefix}全天`;
  if (e.start <= now.getTime()) return '进行中';
  return `${prefix}${hm(e.start)}`;
}

/** 列表里显示的地点：网址类的地点（会议链接）显示成“线上会议”。 */
export function placeLabel(e: CalendarEvent) {
  if (e.location && !/^https?:\/\//i.test(e.location.trim())) return e.location.split('\n')[0];
  return e.conference || e.location ? '线上会议' : '';
}

/** 详情里的完整时间，例如“10月15日 周四 11:00 – 11:30”“10月14日 – 10月16日 · 全天” */
export function whenLabel(e: CalendarEvent) {
  if (e.allDay) {
    const last = e.end - DAY;
    return startOfDay(last) > startOfDay(e.start) ? `${fullDate(e.start)} – ${fullDate(last)} · 全天` : `${fullDate(e.start)} · 全天`;
  }
  if (startOfDay(e.end - 1) > startOfDay(e.start)) return `${fullDate(e.start)} ${hm(e.start)} – ${fullDate(e.end)} ${hm(e.end)}`;
  return `${fullDate(e.start)} ${hm(e.start)} – ${hm(e.end)}`;
}

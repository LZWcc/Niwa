// 日期的几个基础量和写法：节气、日程、庭共用。

export const DAY = 86_400_000;
export const WEEKDAYS = '日一二三四五六';

export const pad2 = (n: number) => String(n).padStart(2, '0');

/** 当天 0 点的时间戳 */
export const startOfDay = (t: number) => new Date(t).setHours(0, 0, 0, 0);

/** 本地日期键，例如 2026-10-14 */
export const dayKey = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

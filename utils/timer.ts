// 计时器：倒计时和正计时的状态和显示，以及到点提醒的闹钟（后台脚本 entrypoints/background.ts 收到后发系统通知）。
import { pad2 } from './date';

export type TimerMode = 'countdown' | 'stopwatch';

/**
 * 只记开始的时刻（startedAt，停着时是 null）和之前走过的时间（elapsed），不每秒写一次：
 * 刷新页面、开着几个标签页都接着走。duration 是倒计时的总长（毫秒）。
 */
export type TimerState = { mode: TimerMode; duration: number; elapsed: number; startedAt: number | null };

export const DEFAULT_TIMER: TimerState = { mode: 'countdown', duration: 25 * 60_000, elapsed: 0, startedAt: null };

export const isTimerState = (v: unknown): v is TimerState => {
  const t = v as TimerState | null;
  return (
    (t?.mode === 'countdown' || t?.mode === 'stopwatch') &&
    typeof t.duration === 'number' &&
    typeof t.elapsed === 'number' &&
    (t.startedAt === null || typeof t.startedAt === 'number')
  );
};

/** 到现在一共走了多久 */
export const spentOf = (t: TimerState, now: number) => t.elapsed + (t.startedAt === null ? 0 : now - t.startedAt);

/** 时间写成 05:00、1:05:00。倒计时向上取整（最后一秒显示 00:01），正计时向下取整 */
export function clockText(ms: number, round: 'up' | 'down') {
  const total = Math.max(0, round === 'up' ? Math.ceil(ms / 1000) : Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h ? `${h}:${pad2(m)}:${pad2(total % 60)}` : `${pad2(m)}:${pad2(total % 60)}`;
}

// 闹钟的名字：前缀 | 小组件 id | 写在通知里的话。后台脚本按前缀认出是计时器的闹钟。
export const TIMER_ALARM = 'niwa-timer';

type Alarms = {
  create: (name: string, info: { when: number }) => void;
  getAll: () => Promise<{ name: string }[]>;
  clear: (name: string) => Promise<boolean>;
};
// 页面测试不在扩展里，没有这个接口：不定闹钟，时间到只在页面上显示。
const alarms = (globalThis as { chrome?: { alarms?: Alarms } }).chrome?.alarms;

/** 取消这个计时器的闹钟（暂停、重置、换时长、移除小组件时） */
export async function clearTimerAlarm(id: string) {
  for (const alarm of (await alarms?.getAll()) ?? []) {
    if (alarm.name.startsWith(`${TIMER_ALARM}|${id}|`)) await alarms!.clear(alarm.name);
  }
}

/** 到 when 时提醒；message 写在通知里，例如“25 分钟的倒计时结束了” */
export async function scheduleTimerAlarm(id: string, when: number, message: string) {
  await clearTimerAlarm(id);
  alarms?.create(`${TIMER_ALARM}|${id}|${message}`, { when });
}

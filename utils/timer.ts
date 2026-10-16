// 计时器：倒计时和正计时的状态和显示，以及到点提醒的闹钟（后台脚本 entrypoints/background.ts 收到后弹出提醒小窗、发系统通知）。
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

/** 倒计时最长一天，最短一秒 */
export const MAX_DURATION = 24 * 3_600_000;

/** 倒计时多长，写在提醒里：25 分钟、4 分 30 秒、1 小时 30 分 */
export function durationText(ms: number) {
  const total = Math.round(ms / 1000);
  const [h, m, s] = [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60];
  if (h) return m ? `${h} 小时 ${m} 分` : `${h} 小时`;
  if (s) return m ? `${m} 分 ${s} 秒` : `${s} 秒`;
  return `${m} 分钟`;
}

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

/**
 * 提醒小窗里的一声轻响：两个正弦音，像敲了一下小钟。
 * 没有点击就弹出来的页面，浏览器可能不让出声（自动播放限制），那就只是不响。
 */
export function chime() {
  const ctx = new AudioContext();
  for (const [freq, at] of [
    [880, 0],
    [1318.5, 0.18],
  ] as const) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + at);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 1.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + at);
    osc.stop(ctx.currentTime + at + 1.5);
  }
}

/** 到 when 时提醒；message 写在小窗和通知里，例如“25 分钟的倒计时结束了” */
export async function scheduleTimerAlarm(id: string, when: number, message: string) {
  await clearTimerAlarm(id);
  alarms?.create(`${TIMER_ALARM}|${id}|${message}`, { when });
}

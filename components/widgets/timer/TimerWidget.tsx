import { useEffect, useRef, useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { pad2 } from '@/utils/date';
import { KEYS } from '@/utils/storage';
import {
  DEFAULT_TIMER,
  MAX_DURATION,
  chime,
  clearTimerAlarm,
  clockText,
  durationText,
  scheduleTimerAlarm,
  spentOf,
  type TimerMode,
  type TimerState,
} from '@/utils/timer';
import type { WidgetProps } from '../types';
import WidgetFrame from '../WidgetFrame';
import WidgetHeader from '../WidgetHeader';

// 计时器：倒计时（还没开始时用滑块粗调时长，面板上时、分、秒上下的箭头细调）和正计时。状态在自己的 settings.timer 里，只记开始的时刻，
// 刷新页面、开着几个标签页都接着走；放几个计时器就各走各的。
// 倒计时开始时定一个闹钟，到点由后台脚本发系统通知，新标签页关了也能收到。
// 通知权限在第一次开始倒计时时问一次（浏览器只许在点击里问），之后在菜单里开关；没给时后台改弹一个提醒小窗。

/** 滑块的刻度（分钟）：常用的是短时间，10 分钟以内一分钟一格，一小时以内五分钟一格，再往上十五分钟一格，最长 3 小时 */
const STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 75, 90, 105, 120, 135, 150, 165, 180];
const NOTIFY = ['notifications'];
const MODES: Record<TimerMode, string> = { countdown: '倒计时', stopwatch: '正计时' };

/** 每个数字放进一样宽的格子（同时钟）：秒数跳动时整串数字不左右晃 */
const digits = (text: string) =>
  [...text].map((c, i) => (
    <span key={i} className={c === ':' ? 'timer-colon' : 'clock-digit'}>
      {c}
    </span>
  ));

type SegmentProps = { text: string; label: string; onStep: (direction: 1 | -1) => void };

/**
 * 倒计时还没开始时，面板上可以调的一段数字（时、分或秒）：悬停时上下出现箭头，点一下加减一，按住不放连续加减、越来越快；
 * 聚焦后也可以按 ↑ ↓。onStep 按当时的设置算（连按时不会用旧值）。
 */
function Segment({ text, label, onStep }: SegmentProps) {
  const hold = useRef<number>(undefined);
  const release = () => clearTimeout(hold.current);
  useEffect(() => release, []);
  const press = (direction: 1 | -1) => {
    onStep(direction);
    const repeat = (delay: number) => {
      hold.current = window.setTimeout(() => {
        onStep(direction);
        repeat(Math.max(50, delay * 0.8));
      }, delay);
    };
    repeat(400);
  };
  const arrow = (direction: 1 | -1) => (
    <button
      type="button"
      className={direction === 1 ? 'timer-arrow is-up' : 'timer-arrow is-down'}
      tabIndex={-1}
      aria-label={`${label}${direction === 1 ? '加一' : '减一'}`}
      onPointerDown={() => press(direction)}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
    >
      <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
        <path
          d={direction === 1 ? 'M1 5l4-4 4 4' : 'M1 1l4 4 4-4'}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
  return (
    <span
      className="timer-seg"
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuetext={`${Number(text)} ${label}`}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();
        onStep(e.key === 'ArrowUp' ? 1 : -1);
      }}
    >
      {arrow(1)}
      {digits(text)}
      {arrow(-1)}
    </span>
  );
}

export default function TimerWidget({ widget, frame, settings, onSettings }: WidgetProps) {
  const { size } = widget;
  const timer = settings.timer ?? DEFAULT_TIMER;
  const [notify, requestNotify, revokeNotify] = usePermissions(NOTIFY);
  const countdown = timer.mode === 'countdown';
  const running = timer.startedAt !== null;
  const spent = spentOf(timer, Date.now());
  const done = countdown && running && spent >= timer.duration;
  const idle = !running && timer.elapsed === 0;
  const total = Math.round(timer.duration / 1000);
  const [editHours, editMinutes, editSeconds] = [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60];
  // 滑块停在最接近当前时长的那一格
  const minutes = timer.duration / 60_000;
  const step = STEPS.reduce((best, m, i) => (Math.abs(m - minutes) < Math.abs(STEPS[best]! - minutes) ? i : best), 0);

  // 看着页面时到了点：响一声（点过「开始」，页面可以出声）。打开页面时已经到点的不响。
  const wasDone = useRef(done);
  useEffect(() => {
    if (done && !wasDone.current && !document.hidden) chime();
    wasDone.current = done;
  }, [done]);

  // 走着的时候每秒刷新几次（时间是按开始的时刻现算的，不靠计数）；停着、到点了就不刷新。
  const [, tick] = useState(0);
  useEffect(() => {
    if (!running || done) return;
    const id = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [running, done]);

  const set = (change: Partial<TimerState>) => onSettings((s) => ({ timer: { ...(s.timer ?? DEFAULT_TIMER), ...change } }));
  // 面板上的箭头：按当时的时长算（按住连续加减时不会用旧值）。时、分加减一整格（会进位），秒在 0–59 里转一圈、不动分钟。
  const adjust = (change: (duration: number) => number) =>
    onSettings((s) => {
      const t = s.timer ?? DEFAULT_TIMER;
      return { timer: { ...t, duration: Math.min(MAX_DURATION, Math.max(1000, change(t.duration))) } };
    });
  const stepSeconds = (direction: 1 | -1) =>
    adjust((d) => {
      const seconds = Math.round(d / 1000) % 60;
      return d + (((((seconds + direction) % 60) + 60) % 60) - seconds) * 1000;
    });
  const stop = (change: Partial<TimerState>) => {
    set({ elapsed: 0, startedAt: null, ...change });
    void clearTimerAlarm(widget.id);
  };
  const start = () => {
    if (countdown && notify === false && !localStorage.getItem(KEYS.timerNotifyAsked)) {
      localStorage.setItem(KEYS.timerNotifyAsked, 'yes');
      requestNotify();
    }
    const now = Date.now();
    set({ startedAt: now });
    if (countdown)
      void scheduleTimerAlarm(widget.id, now + timer.duration - timer.elapsed, `${durationText(timer.duration)}的倒计时结束了`);
  };
  const pause = () => {
    set({ elapsed: spent, startedAt: null });
    void clearTimerAlarm(widget.id);
  };

  const menu = (
    <>
      {size === 's' && (
        <button type="button" role="menuitem" className="menu-item" onClick={() => stop({ mode: countdown ? 'stopwatch' : 'countdown' })}>
          改成{countdown ? '正计时' : '倒计时'}
        </button>
      )}
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={notify === true}
        className="menu-item"
        onClick={notify ? revokeNotify : requestNotify}
      >
        时间到时发通知
      </button>
      {/* 不用等：一秒后走一遍和真到点一样的提醒，看看通知能不能弹出来 */}
      <button
        type="button"
        role="menuitem"
        className="menu-item"
        onClick={() => void scheduleTimerAlarm(`test-${widget.id}`, Date.now() + 1000, '这是一条测试提醒，到点时就是这样')}
      >
        试一下提醒
      </button>
    </>
  );

  return (
    <WidgetFrame widget={widget} frame={frame} menu={menu}>
      <div className={`timer timer-${size}`}>
        <WidgetHeader title="计时器" meta={size === 's' && MODES[timer.mode]}>
          {size !== 's' && (
            <div className="links-tabs" role="group" aria-label="倒计时还是正计时">
              {(Object.keys(MODES) as TimerMode[]).map((mode) => (
                <button key={mode} type="button" className="links-tab" aria-pressed={mode === timer.mode} onClick={() => stop({ mode })}>
                  {MODES[mode]}
                </button>
              ))}
            </div>
          )}
        </WidgetHeader>

        <div className="timer-body">
          <div className={done ? 'timer-panel widget-panel is-dotted is-done' : 'timer-panel widget-panel is-dotted'}>
            {countdown && idle ? (
              // 还没开始：时、分、秒可以一段一段地调
              <span className="timer-time is-editable">
                {editHours > 0 && (
                  <>
                    <Segment text={String(editHours)} label="小时" onStep={(d) => adjust((x) => x + d * 3_600_000)} />
                    <span className="timer-colon">:</span>
                  </>
                )}
                <Segment text={pad2(editMinutes)} label="分钟" onStep={(d) => adjust((x) => x + d * 60_000)} />
                <span className="timer-colon">:</span>
                <Segment text={pad2(editSeconds)} label="秒" onStep={stepSeconds} />
              </span>
            ) : (
              <span className="timer-time" role="timer" aria-live="off">
                {done ? '时间到' : digits(countdown ? clockText(timer.duration - spent, 'up') : clockText(spent, 'down'))}
              </span>
            )}
            {/* 进度条走起来才有意义；还没开始时那里留给下面的箭头 */}
            {countdown && !idle && (
              <span className="timer-bar" aria-hidden="true">
                <span style={{ width: `${Math.min(100, (spent / timer.duration) * 100)}%` }} />
              </span>
            )}
          </div>

          <div className="timer-controls">
            {/* 小尺寸放不下滑块，只用面板上的箭头 */}
            {countdown && idle && size !== 's' && (
              <input
                type="range"
                className="timer-slider"
                min={0}
                max={STEPS.length - 1}
                value={step}
                aria-label="倒计时多长"
                aria-valuetext={`${STEPS[step]} 分钟`}
                style={{ '--pct': `${(step / (STEPS.length - 1)) * 100}%` } as React.CSSProperties}
                onChange={(e) => set({ duration: STEPS[Number(e.target.value)]! * 60_000 })}
              />
            )}
            <div className="timer-buttons">
              {done ? (
                <button type="button" className="btn btn-primary" onClick={() => stop({})}>
                  知道了
                </button>
              ) : (
                <>
                  <button type="button" className="btn btn-primary" onClick={running ? pause : start}>
                    {running ? '暂停' : idle ? '开始' : '继续'}
                  </button>
                  {!idle && (
                    <button type="button" className="btn" onClick={() => stop({})}>
                      重置
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </WidgetFrame>
  );
}

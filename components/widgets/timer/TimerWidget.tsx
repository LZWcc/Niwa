import { useEffect, useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { DEFAULT_TIMER, clearTimerAlarm, clockText, scheduleTimerAlarm, spentOf, type TimerMode, type TimerState } from '@/utils/timer';
import type { WidgetProps } from '../types';
import WidgetFrame from '../WidgetFrame';
import WidgetHeader from '../WidgetHeader';

// 计时器：倒计时（快捷时长，大尺寸可以自定义）和正计时。状态在自己的 settings.timer 里，只记开始的时刻，
// 刷新页面、开着几个标签页都接着走；放几个计时器就各走各的。
// 倒计时开始时定一个闹钟，到点由后台脚本发系统通知（要在菜单里打开通知），新标签页关了也能收到。

const PRESETS = [5, 10, 25, 60];
const NOTIFY = ['notifications'];
const MODES: Record<TimerMode, string> = { countdown: '倒计时', stopwatch: '正计时' };

/** 每个数字放进一样宽的格子（同时钟）：秒数跳动时整串数字不左右晃 */
const digits = (text: string) =>
  [...text].map((c, i) => (
    <span key={i} className={c === ':' ? 'timer-colon' : 'clock-digit'}>
      {c}
    </span>
  ));

export default function TimerWidget({ widget, frame, settings, onSettings }: WidgetProps) {
  const { size } = widget;
  const timer = settings.timer ?? DEFAULT_TIMER;
  const [notify, requestNotify, revokeNotify] = usePermissions(NOTIFY);
  const countdown = timer.mode === 'countdown';
  const running = timer.startedAt !== null;
  const spent = spentOf(timer, Date.now());
  const done = countdown && running && spent >= timer.duration;
  const idle = !running && timer.elapsed === 0;

  // 走着的时候每秒刷新几次（时间是按开始的时刻现算的，不靠计数）；停着、到点了就不刷新。
  const [, tick] = useState(0);
  useEffect(() => {
    if (!running || done) return;
    const id = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [running, done]);

  const set = (change: Partial<TimerState>) => onSettings((s) => ({ timer: { ...(s.timer ?? DEFAULT_TIMER), ...change } }));
  const stop = (change: Partial<TimerState>) => {
    set({ elapsed: 0, startedAt: null, ...change });
    void clearTimerAlarm(widget.id);
  };
  const start = () => {
    const now = Date.now();
    set({ startedAt: now });
    if (countdown)
      void scheduleTimerAlarm(widget.id, now + timer.duration - timer.elapsed, `${Math.round(timer.duration / 60_000)} 分钟的倒计时结束了`);
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
            <span className="timer-time" role="timer" aria-live="off">
              {done ? '时间到' : digits(countdown ? clockText(timer.duration - spent, 'up') : clockText(spent, 'down'))}
            </span>
            {countdown && (
              <span className="timer-bar" aria-hidden="true">
                <span style={{ width: `${Math.min(100, (spent / timer.duration) * 100)}%` }} />
              </span>
            )}
          </div>

          <div className="timer-controls">
            {countdown && idle && size !== 's' && (
              <div className="timer-presets" role="group" aria-label="时长">
                {PRESETS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className="timer-preset"
                    aria-pressed={timer.duration === m * 60_000}
                    onClick={() => stop({ duration: m * 60_000 })}
                  >
                    {m} 分
                  </button>
                ))}
              </div>
            )}
            {countdown && idle && size === 'l' && (
              <label className="timer-custom">
                自定义
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={Math.round(timer.duration / 60_000)}
                  onChange={(e) => {
                    const minutes = Math.round(Number(e.target.value));
                    if (minutes >= 1 && minutes <= 999) stop({ duration: minutes * 60_000 });
                  }}
                />
                分钟
              </label>
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

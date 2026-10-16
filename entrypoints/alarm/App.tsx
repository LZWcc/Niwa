import { useEffect, useRef } from 'react';
import { pad2 } from '@/utils/date';
import { isGridItem } from '@/utils/grid/items';
import { KEYS, readList, writeJson } from '@/utils/storage';
import { DEFAULT_TIMER, chime, scheduleTimerAlarm, type TimerState } from '@/utils/timer';

// 提醒小窗：弹在浏览器窗口右上角，几秒后自己关掉，鼠标停在上面时不关。
// 地址里带着是哪个计时器（id）和要说的话（message）。
const params = new URLSearchParams(location.search);
const id = params.get('id') ?? '';
const message = params.get('message') ?? '倒计时结束了';

/** 改网格里这个计时器的状态：新标签页通过 storage 事件同步过去 */
function update(change: (timer: TimerState) => Partial<TimerState>) {
  const grid = readList(KEYS.grid, isGridItem, []);
  const item = grid.find((i) => i.id === id && i.kind === 'widget');
  if (item?.kind !== 'widget') return null;
  const timer = { ...(item.settings?.timer ?? DEFAULT_TIMER) };
  Object.assign(timer, change(timer));
  item.settings = { ...item.settings, timer };
  writeJson(KEYS.grid, grid);
  return timer;
}

// 关掉这个小窗：扩展自己开的窗口，用 windows 接口关（window.close 不一定关得掉）。页面测试里没有这个接口。
const closeWindow = () => {
  const windows = (
    globalThis as { chrome?: { windows?: { getCurrent: () => Promise<{ id?: number }>; remove: (id: number) => Promise<void> } } }
  ).chrome?.windows;
  void windows?.getCurrent().then((w) => windows.remove(w.id!));
};

/** 几秒后自己关掉 */
const STAY = 8000;

export default function App() {
  const timer = useRef<number>(undefined);
  const leave = () => {
    timer.current = window.setTimeout(closeWindow, STAY);
  };
  useEffect(() => {
    chime();
    leave();
    return () => clearTimeout(timer.current);
  }, []);

  const now = new Date();
  return (
    <main className="alarm" onMouseEnter={() => clearTimeout(timer.current)} onMouseLeave={leave}>
      <p className="alarm-kind">计时器 · {`${pad2(now.getHours())}:${pad2(now.getMinutes())}`}</p>
      <h1 className="alarm-title">时间到</h1>
      <p className="alarm-message">{message}</p>
      <div className="alarm-actions">
        <button
          type="button"
          className="btn"
          onClick={() => {
            // 同样的时长重新开始，再定一个闹钟
            const timer = update(() => ({ elapsed: 0, startedAt: Date.now() }));
            if (timer) void scheduleTimerAlarm(id, Date.now() + timer.duration, message);
            closeWindow();
          }}
        >
          再计一次
        </button>
        <button
          type="button"
          className="btn btn-primary"
          autoFocus
          onClick={() => {
            update(() => ({ elapsed: 0, startedAt: null }));
            closeWindow();
          }}
        >
          知道了
        </button>
      </div>
    </main>
  );
}

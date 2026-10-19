import { useState } from 'react';
import { useCalendar } from '@/hooks/useCalendar';
import type { WidgetProps } from '../types';
import WidgetFrame from '../WidgetFrame';
import CalendarAgenda from './CalendarAgenda';
import CalendarDialog from './CalendarDialog';
import CalendarMonth from './CalendarMonth';

// 日程小组件：读日历数据，外框菜单里放“打开月历 / 立即刷新 / 管理日历”，另带两个对话框。
// 数据钩子只在这个小组件存在时挂载：没添加日程就不会发任何请求。
// 把 .ics 文件拖到卡片上：打开「管理日历」并导入，结果显示在对话框里。
export default function CalendarWidget({ widget, frame, now }: WidgetProps) {
  const calendar = useCalendar(now);
  const [setupOpen, setSetupOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [dropped, setDropped] = useState<File[] | null>(null);
  const [dropping, setDropping] = useState(false);

  const menu = (
    <>
      {calendar.sources.length > 0 && (
        <>
          <button type="button" role="menuitem" className="menu-item" onClick={() => setMonthOpen(true)}>
            打开月历
          </button>
          <button type="button" role="menuitem" className="menu-item" onClick={() => void calendar.refresh()}>
            立即刷新
          </button>
        </>
      )}
      <button type="button" role="menuitem" className="menu-item" onClick={() => setSetupOpen(true)}>
        管理日历…
      </button>
    </>
  );

  return (
    <>
      <WidgetFrame widget={widget} frame={frame} menu={menu}>
        {/* display: contents，不影响卡片的排版；拖着文件经过时整张卡片描一圈虚线（calendar.css） */}
        <div
          className={dropping ? 'cal-drop is-dropping' : 'cal-drop'}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes('Files')) return;
            e.preventDefault();
            setDropping(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropping(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDropping(false);
            setDropped([...e.dataTransfer.files]);
            setSetupOpen(true);
          }}
        >
          <CalendarAgenda
            size={widget.size}
            now={now}
            calendar={calendar}
            onSetup={() => setSetupOpen(true)}
            onOpenMonth={() => setMonthOpen(true)}
          />
        </div>
      </WidgetFrame>
      <CalendarDialog
        open={setupOpen}
        calendar={calendar}
        dropped={dropped}
        onClose={() => {
          setSetupOpen(false);
          setDropped(null);
        }}
      />
      <CalendarMonth open={monthOpen} now={now} sources={calendar.sources} onClose={() => setMonthOpen(false)} />
    </>
  );
}

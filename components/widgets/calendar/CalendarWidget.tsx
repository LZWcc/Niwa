import { useState } from 'react';
import { useCalendar } from '@/hooks/useCalendar';
import type { WidgetProps } from '../types';
import WidgetFrame from '../WidgetFrame';
import CalendarAgenda from './CalendarAgenda';
import CalendarDialog from './CalendarDialog';
import CalendarMonth from './CalendarMonth';

// 日程小组件：读日历数据，外框菜单里放“打开月历 / 立即刷新 / 管理日历”，另带两个对话框。
// 数据钩子只在这个小组件存在时挂载：没添加日程就不会发任何请求。
export default function CalendarWidget({ widget, frame, now }: WidgetProps) {
  const calendar = useCalendar(now);
  const [setupOpen, setSetupOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);

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
        <CalendarAgenda
          size={widget.size}
          now={now}
          calendar={calendar}
          onSetup={() => setSetupOpen(true)}
          onOpenMonth={() => setMonthOpen(true)}
        />
      </WidgetFrame>
      <CalendarDialog open={setupOpen} calendar={calendar} onClose={() => setSetupOpen(false)} />
      <CalendarMonth open={monthOpen} now={now} sources={calendar.sources} onClose={() => setMonthOpen(false)} />
    </>
  );
}

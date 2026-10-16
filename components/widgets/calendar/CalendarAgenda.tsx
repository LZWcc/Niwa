import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import Popover from '@/components/common/Popover';
import type { CalendarState } from '@/hooks/useCalendar';
import { dayLabel, placeLabel, shortTime, timeLabel } from '@/utils/calendar/format';
import type { CalendarEvent, CalendarSource } from '@/utils/calendar/ical';
import { DAY, WEEKDAYS, hm, startOfDay } from '@/utils/date';
import type { WidgetSize } from '@/utils/widgets';
import WidgetHeader from '../WidgetHeader';
import EventDetail from './EventDetail';

// 日程小组件里的内容：按尺寸列出接下来 7 天的日程，能放几条放几条、不出滚动条；点一条看详情。

type RowProps = {
  event: CalendarEvent;
  source?: CalendarSource;
  now: Date;
  showDay?: boolean;
  compact?: boolean;
  /** 按天分组时，单行只写时刻，不再加“明天”等前缀 */
  grouped?: boolean;
  open: boolean;
  onOpen: (anchor: HTMLElement) => void;
};

function EventRow({ event, source, now, showDay, compact, grouped, open, onOpen }: RowProps) {
  const live = event.start <= now.getTime() && !event.allDay;
  const place = placeLabel(event);
  return (
    <button
      type="button"
      className={`event${compact ? ' is-compact' : ''}${open ? ' is-open' : ''}`}
      aria-expanded={open}
      aria-haspopup="dialog"
      onClick={(e) => onOpen(e.currentTarget)}
    >
      <span className="event-bar" style={{ background: source?.color }} aria-hidden="true" />
      {compact ? (
        <>
          <span className={live ? 'event-time is-now' : 'event-time'}>
            {grouped ? (event.allDay ? '全天' : live ? '进行中' : hm(event.start)) : shortTime(event, now)}
          </span>
          <span className="event-title">{event.title}</span>
          {place && <span className="event-place">{place}</span>}
        </>
      ) : (
        <span className="event-body">
          <span className="event-title">{event.title}</span>
          <span className="event-meta">
            <span className={live ? 'event-time is-now' : 'event-time'}>
              {showDay && `${dayLabel(event.start, now)} · `}
              {timeLabel(event, now)}
            </span>
            {place && <span className="event-place">{place}</span>}
          </span>
        </span>
      )}
    </button>
  );
}

type Props = {
  size: WidgetSize;
  now: Date;
  calendar: CalendarState;
  onSetup: () => void;
  onOpenMonth: () => void;
};

// 小组件只看接下来 7 天；更远的在月历里看。
const HORIZON = 7;
// 先按这么多条排版，再量出实际放得下几条。
const CANDIDATES: Record<WidgetSize, number> = { s: 1, m: 8, l: 14 };

export default function CalendarAgenda({ size, now, calendar, onSetup, onOpenMonth }: Props) {
  const { sources, events, loading, failed, fetchedAt } = calendar;
  const sourceOf = (e: CalendarEvent) => sources.find((s) => s.id === e.source);
  const weekday = `星期${WEEKDAYS[now.getDay()]}`;
  const [detail, setDetail] = useState<{ event: CalendarEvent; anchor: HTMLElement } | null>(null);
  const close = useCallback(() => setDetail(null), []);

  // 能放几条就放几条，不出现滚动条：先把候选全部排出来，量出第一条超出底边的位置，再截断。
  // 在浏览器绘制前完成，不会闪。
  const listRef = useRef<HTMLDivElement>(null);
  const todayStart = startOfDay(now.getTime());
  const week = events.filter((e) => e.start < todayStart + HORIZON * DAY);
  const candidates = week.slice(0, CANDIDATES[size]);
  const fitKey = `${size}|${candidates.map((e) => e.id).join(',')}|${loading}|${failed.length}`;
  const [fit, setFit] = useState<{ key: string; count: number } | null>(null);
  useLayoutEffect(() => {
    const box = listRef.current;
    if (!box || fit?.key === fitKey) return;
    const bottom = box.getBoundingClientRect().bottom + 0.5;
    const rows = [...box.querySelectorAll('.event')];
    const overflow = rows.findIndex((row) => row.getBoundingClientRect().bottom > bottom);
    setFit({ key: fitKey, count: overflow === -1 ? rows.length : overflow });
    // fitKey 涵盖了尺寸和候选日程：它变了才需要重新量。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);
  const shown = fit?.key === fitKey ? candidates.slice(0, fit.count) : candidates;

  // 每一行都能点开详情；再点同一行收起。
  const row = (event: CalendarEvent, extra: { showDay?: boolean; compact?: boolean; grouped?: boolean } = {}) => (
    <EventRow
      key={event.id}
      event={event}
      source={sourceOf(event)}
      now={now}
      {...extra}
      open={detail?.event.id === event.id}
      onOpen={(anchor) => setDetail((d) => (d?.event.id === event.id ? null : { event, anchor }))}
    />
  );
  const popover = detail && (
    <Popover anchor={detail.anchor} placement="side" onClose={close} label={detail.event.title} className="detail-popover">
      <EventDetail event={detail.event} source={sourceOf(detail.event)} now={now} />
    </Popover>
  );

  if (sources.length === 0) {
    return (
      <div className={`cal cal-${size} cal-empty`}>
        <WidgetHeader title="日程" />
        <p>{size === 's' ? '连接日历，看接下来的日程。' : '连接 Google 日历，在这里看接下来的日程。只读，不需要登录。'}</p>
        <button type="button" className="btn btn-primary" onClick={onSetup}>
          连接日历
        </button>
      </div>
    );
  }

  const status = loading
    ? '更新中…'
    : failed.length
      ? `${failed.length} 个日历更新失败${fetchedAt ? `，显示的是 ${hm(fetchedAt)} 的数据` : ''}`
      : '';
  // 鼠标悬停在状态上时显示每个日历失败的原因。
  const failure = failed.map((f) => `${sources.find((s) => s.id === f.id)?.name || '日历'}：${f.message}`).join('\n');
  const today = events.filter((e) => e.start < todayStart + DAY);

  const header = <WidgetHeader title="日程" meta={today.length ? `今天 ${today.length} 项` : '今天没有日程'} />;
  // 日期放在内嵌面板里，点它打开月历。
  const date = (
    <button type="button" className="cal-date widget-panel is-dotted" onClick={onOpenMonth} title="打开月历">
      <span className="cal-weekday">{weekday}</span>
      <span className="cal-day">{now.getDate()}</span>
    </button>
  );
  // 底栏：更新状态，和进月历的入口（放不下的日程不另作说明，统一从这里进月历看）。
  const foot = (
    <div className="cal-foot">
      {status ? (
        <span className={failed.length ? 'cal-status is-error' : 'cal-status'} title={failure || undefined}>
          {status}
        </span>
      ) : (
        <span />
      )}
      <button type="button" className="cal-more" onClick={onOpenMonth}>
        月历 ›
      </button>
    </div>
  );

  if (size === 's') {
    const next = events[0];
    return (
      <div className="cal cal-s" title={status || undefined}>
        {header}
        {date}
        <div className="cal-list" ref={listRef}>
          {next ? row(next, { showDay: next.start >= todayStart + DAY }) : <p className="cal-none">接下来没有日程</p>}
        </div>
        {popover}
      </div>
    );
  }

  if (size === 'm') {
    return (
      <div className="cal cal-m">
        {header}
        <div className="cal-body">
          {date}
          <div className="cal-main">
            <div className="cal-list" ref={listRef}>
              {shown.length ? shown.map((e) => row(e, { compact: true })) : <p className="cal-none">接下来 7 天没有日程</p>}
            </div>
            {foot}
          </div>
        </div>
        {popover}
      </div>
    );
  }

  // 大：按天分组，排到放不下为止。
  const groups = new Map<string, CalendarEvent[]>();
  for (const e of shown) {
    const label = dayLabel(Math.max(e.start, now.getTime()), now);
    groups.set(label, [...(groups.get(label) ?? []), e]);
  }
  return (
    <div className="cal cal-l">
      {header}
      <button type="button" className="cal-date is-inline widget-panel is-dotted" onClick={onOpenMonth} title="打开月历">
        <span className="cal-day">{now.getDate()}</span>
        <span className="cal-weekday">{weekday}</span>
      </button>
      <div className="cal-groups" ref={listRef}>
        {groups.size ? (
          [...groups].map(([label, list]) => (
            <section key={label} className="cal-group">
              <h3>{label}</h3>
              {list.map((e) => row(e, { compact: true, grouped: true }))}
            </section>
          ))
        ) : (
          <p className="cal-none">接下来 7 天没有日程</p>
        )}
      </div>
      {foot}
      {popover}
    </div>
  );
}

import { useEffect, useState } from 'react';
import Dialog from '@/components/common/Dialog';
import { solarTermOn } from '@/utils/almanac';
import { fullDate, placeLabel } from '@/utils/calendar/format';
import { byStart, loadCalendar, type CalendarEvent, type CalendarSource } from '@/utils/calendar/ical';
import { DAY, hm, startOfDay } from '@/utils/date';
import { toUserMessage } from '@/utils/errors';
import EventDetail from './EventDetail';

// 月历：翻月份、看每天的日程和节气，右侧是选中那天的列表和详情。

type Props = { open: boolean; now: Date; sources: CalendarSource[]; onClose: () => void };

const HEADERS = ['一', '二', '三', '四', '五', '六', '日'];
const CHIPS = 3;

/** 这个月的月历从哪天开始：1 号所在那一周的周一。 */
function gridStart(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  return new Date(first.getFullYear(), first.getMonth(), 1 - ((first.getDay() + 6) % 7));
}

const overlaps = (e: CalendarEvent, day: number) => e.start < day + DAY && e.end > day;

function EventLine({ event, source, now, onOpen }: { event: CalendarEvent; source?: CalendarSource; now: Date; onOpen: () => void }) {
  const place = placeLabel(event);
  return (
    <button type="button" className={event.end <= now.getTime() ? 'month-event is-past' : 'month-event'} onClick={onOpen}>
      <span className="event-bar" style={{ background: source?.color }} aria-hidden="true" />
      <span className="month-event-time">{event.allDay ? '全天' : hm(event.start)}</span>
      <span className="month-event-body">
        <span className="month-event-title">{event.title}</span>
        {place && <span className="event-place">{place}</span>}
      </span>
    </button>
  );
}

export default function CalendarMonth({ open, now, sources, onClose }: Props) {
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState(() => startOfDay(now.getTime()));
  const [detail, setDetail] = useState<CalendarEvent | null>(null);
  const [data, setData] = useState<{ key: string; events: CalendarEvent[]; failed: string[] } | null>(null);

  const first = gridStart(month);
  const start = first.getTime();
  // 6 周 × 7 天，用日期加减而不是毫秒相加，避开夏令时的 23/25 小时。
  const days = Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i).getTime());
  const until = days[41]! + DAY;
  const key = `${start}|${sources.map((s) => s.url).join('|')}`;

  // 打开或翻页时展开这一屏的日程；解析结果在内存里，翻页不会重新下载。
  useEffect(() => {
    if (!open) return;
    let alive = true;
    Promise.allSettled(sources.map((s) => loadCalendar(s).then((c) => c.expand(start, until)))).then((results) => {
      if (!alive) return;
      const events = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : [])).sort(byStart);
      const failed = results.flatMap((r) => (r.status === 'rejected' ? [toUserMessage(r.reason, '月历加载日历')] : []));
      setData({ key, events, failed: [...new Set(failed)] });
    });
    return () => {
      alive = false;
    };
    // key 已包含这一屏的起点（start，until 由它算出）和各日历的地址。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key]);

  const ready = data?.key === key;
  const events = ready ? data.events : [];
  const sourceOf = (e: CalendarEvent) => sources.find((s) => s.id === e.source);
  const today = startOfDay(now.getTime());
  const dayEvents = events.filter((e) => overlaps(e, selected));

  const shift = (n: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + n, 1);
    setMonth(next);
    setSelected(next.getFullYear() === now.getFullYear() && next.getMonth() === now.getMonth() ? today : next.getTime());
    setDetail(null);
  };
  const goToday = () => {
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelected(today);
    setDetail(null);
  };

  const selectedDate = new Date(selected);
  const selectedTerm = solarTermOn(selectedDate);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="dialog month-dialog"
      labelledBy="month-title"
      onOpen={(el) => {
        // 每次打开都回到今天；焦点放在月历本身，而不是第一个按钮上（否则一打开就有焦点框）。
        goToday();
        el.querySelector<HTMLElement>('.month')?.focus();
      }}
    >
      <div className="month" tabIndex={-1}>
        <header className="month-head">
          <div className="month-nav">
            <button type="button" className="month-arrow" onClick={() => shift(-1)} aria-label="上个月">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path
                  d="M8.5 3 4.5 7l4 4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button type="button" className="month-arrow" onClick={() => shift(1)} aria-label="下个月">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="m5.5 3 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <h2 id="month-title">
              {month.getFullYear()}年{month.getMonth() + 1}月
            </h2>
            <button type="button" className="btn month-today" onClick={goToday}>
              今天
            </button>
          </div>
          <span className="month-status">{!ready ? '加载中…' : data.failed.join('；')}</span>
          <button type="button" className="month-close" onClick={onClose} aria-label="关闭月历">
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="month-body">
          <div className="month-grid" role="grid" aria-label={`${month.getFullYear()}年${month.getMonth() + 1}月`}>
            {HEADERS.map((h) => (
              <div key={h} className="month-weekday" role="columnheader">
                {h}
              </div>
            ))}
            {days.map((day) => {
              const date = new Date(day);
              const list = events.filter((e) => overlaps(e, day));
              const term = solarTermOn(date);
              const classes = [
                'month-day',
                date.getMonth() !== month.getMonth() && 'is-outside',
                day === today && 'is-today',
                day === selected && 'is-selected',
              ].filter(Boolean);
              return (
                <button
                  key={day}
                  type="button"
                  role="gridcell"
                  className={classes.join(' ')}
                  aria-selected={day === selected}
                  aria-label={`${fullDate(day)}，${list.length ? `${list.length} 项日程` : '没有日程'}`}
                  onClick={() => {
                    setSelected(day);
                    setDetail(null);
                  }}
                >
                  <span className="month-day-head">
                    <span className="month-num">{date.getDate()}</span>
                    {term && <span className="month-term">{term}</span>}
                  </span>
                  {list.slice(0, CHIPS).map((e) => (
                    <span
                      key={e.id}
                      className={e.allDay ? 'month-chip is-allday' : 'month-chip'}
                      style={{ '--chip': sourceOf(e)?.color } as React.CSSProperties}
                    >
                      {e.title}
                    </span>
                  ))}
                  {list.length > CHIPS && <span className="month-more">+{list.length - CHIPS}</span>}
                </button>
              );
            })}
          </div>

          <aside className="month-side" aria-live="polite">
            {detail ? (
              <>
                <button type="button" className="month-back" onClick={() => setDetail(null)}>
                  <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true">
                    <path
                      d="M8.5 3 4.5 7l4 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {fullDate(selected)}
                </button>
                <EventDetail event={detail} source={sourceOf(detail)} now={now} />
              </>
            ) : (
              <>
                <h3 className="month-side-title">
                  {fullDate(selected)}
                  {selectedTerm && <span className="month-term">{selectedTerm}</span>}
                </h3>
                <p className="month-side-sub">
                  {[selected === today && '今天', dayEvents.length && `${dayEvents.length} 项日程`].filter(Boolean).join(' · ')}
                </p>
                {ready && dayEvents.length === 0 && <p className="cal-none">这天没有日程</p>}
                <div className="month-events">
                  {dayEvents.map((e) => (
                    <EventLine key={e.id} event={e} source={sourceOf(e)} now={now} onOpen={() => setDetail(e)} />
                  ))}
                </div>
              </>
            )}
          </aside>
        </div>
      </div>
    </Dialog>
  );
}

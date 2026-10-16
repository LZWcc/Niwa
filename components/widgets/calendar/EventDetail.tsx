import { Fragment } from 'react';
import { dayLink, whenLabel } from '@/utils/calendar/format';
import type { CalendarEvent, CalendarSource } from '@/utils/calendar/ical';

// 一条日程的详情：小组件的弹出层和月历右侧共用。

/** 文本里的网址变成可点的链接，其余原样显示（不用 innerHTML）。 */
function Linkify({ text }: { text: string }) {
  return (
    <>
      {text.split(/(https?:\/\/[^\s<>"]+)/g).map((part, i) =>
        i % 2 ? (
          <a key={i} href={part} target="_blank" rel="noreferrer">
            {part}
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

export default function EventDetail({ event, source, now }: { event: CalendarEvent; source?: CalendarSource; now: Date }) {
  const live = !event.allDay && event.start <= now.getTime();
  const link = dayLink(event, source);
  return (
    <div className="detail">
      <p className="detail-cal">
        <span className="source-dot" style={{ background: source?.color }} aria-hidden="true" />
        {source?.name || '日历'}
      </p>
      <h3 className="detail-title">{event.title}</h3>
      <p className="detail-when">
        {whenLabel(event)}
        {live && <span className="detail-live">进行中</span>}
      </p>

      {event.conference && (
        <a className="btn btn-primary detail-join" href={event.conference} target="_blank" rel="noreferrer">
          加入会议
        </a>
      )}

      {event.location && (
        <div className="detail-row">
          <svg className="detail-icon" width="14" height="14" viewBox="0 0 14 14" aria-label="地点">
            <path d="M7 12.5s4-3.6 4-6.7A4 4 0 0 0 3 5.8c0 3.1 4 6.7 4 6.7Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="7" cy="5.8" r="1.4" fill="currentColor" />
          </svg>
          <span className="detail-text">
            <Linkify text={event.location} />
          </span>
        </div>
      )}

      {event.description && (
        <div className="detail-desc">
          <Linkify text={event.description} />
        </div>
      )}

      {link && (
        <a className="detail-open" href={link} target="_blank" rel="noreferrer">
          在 Google 日历中打开
        </a>
      )}
    </div>
  );
}

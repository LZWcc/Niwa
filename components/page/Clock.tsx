import { almanac } from '@/utils/almanac';
import { pad2 } from '@/utils/date';

// 左上角：时:分，下面一行日期、节气、候。
export default function Clock({ now }: { now: Date }) {
  const { term, pentad, date } = almanac(now);
  return (
    <header className="topbar">
      <h1 className="clock">
        <time dateTime={now.toISOString()}>
          {pad2(now.getHours())}
          <span className="clock-colon">:</span>
          {pad2(now.getMinutes())}
        </time>
      </h1>
      <p className="date">
        <span>{date}</span>
        <span className="date-term">{term}</span>
        <span>{pentad}</span>
      </p>
    </header>
  );
}

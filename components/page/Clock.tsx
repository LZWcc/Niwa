import { almanac } from '@/utils/almanac';
import { pad2 } from '@/utils/date';

// 时钟字体（子集）没有等宽数字表，tabular-nums 不起作用：每个数字放进同样宽的格子里，时间变了右边的日期也不挪。
const digits = (n: number) =>
  [...pad2(n)].map((d, i) => (
    <span key={i} className="clock-digit">
      {d}
    </span>
  ));

// 左上角：时:分，右边一行日期、节气、候，下面一行是这一候在《月令七十二候集解》里的解释；
// 悬停或聚焦时展开这一候的完整原文。
export default function Clock({ now }: { now: Date }) {
  const { term, pentad, note, date } = almanac(now);
  // 完整原文以候名开头，卡片的标题已经写了，不重复
  const text = note.text.startsWith(`${pentad}。`) ? note.text.slice(pentad.length + 1) : note.text;
  return (
    <header className="topbar">
      <h1 className="clock">
        <time dateTime={now.toISOString()}>
          {digits(now.getHours())}
          <span className="clock-colon">:</span>
          {digits(now.getMinutes())}
        </time>
      </h1>
      <div className="date-block">
        <p className="date">
          <span>{date}</span>
          <span className="date-term">{term}</span>
          <span>{pentad}</span>
        </p>
        {/* 小字和卡片放在一起，悬停算在整个容器上：鼠标从小字移进卡片时卡片不收起 */}
        <div className="pentad">
          <button type="button" className="pentad-note" aria-describedby="pentad-card">
            {note.note}
          </button>
          <div id="pentad-card" className="pentad-card" role="tooltip">
            <p className="pentad-card-title">
              {pentad}
              <span>{term}</span>
            </p>
            <p className="pentad-card-text">{text}</p>
            <p className="pentad-card-source">元 · 吴澄《月令七十二候集解》</p>
          </div>
        </div>
      </div>
    </header>
  );
}

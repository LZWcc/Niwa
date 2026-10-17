import type { WeatherState } from '@/hooks/useWeather';
import { hm } from '@/utils/date';
import { dateLabel, daysFrom, deg, hourLabel, kindOf, weekdayLabel } from '@/utils/weather';
import PanelDialog, { RefreshButton } from '../PanelDialog';
import WeatherIcon from './WeatherIcon';

type Props = { open: boolean; now: Date; weather: WeatherState; onClose: () => void };

// 天气的大面板：现在的天气和体感、湿度、风、日出日落，接下来 24 小时（带降水概率），7 天预报。
// 用的是卡片已经取到的数据，不多请求。

export default function WeatherPanel({ open, now, weather, onClose }: Props) {
  const { place, forecast, error, loading, fetchedAt } = weather;
  if (!place || !forecast) return null;
  const { current, offset } = forecast;
  const days = daysFrom(forecast, now);
  const today = days[0];
  const hours = [
    { time: now.getTime(), temp: current.temp, code: current.code, day: current.day, pop: undefined },
    ...forecast.hours.filter((h) => h.time > now.getTime()),
  ];
  // 温度条按这几天里的最低、最高温度对齐
  const lo = Math.min(...days.map((d) => d.min));
  const span = Math.max(...days.map((d) => d.max)) - lo || 1;
  const status = loading ? '更新中…' : error ? error : `${hm(fetchedAt)} 更新`;

  return (
    <PanelDialog
      open={open}
      onClose={onClose}
      title={`${place.name}的天气`}
      className="weather-dialog"
      status={status}
      actions={<RefreshButton onClick={() => void weather.refresh()} />}
    >
      <section className="wp-now widget-panel is-dotted">
        <WeatherIcon kind={kindOf(current.code)} day={current.day} size={72} />
        <div className="wp-now-main">
          <span className="wp-temp">{deg(current.temp)}</span>
          <span className="wp-desc">
            {current.text}
            {today && ` · ${deg(today.max)} / ${deg(today.min)}`}
          </span>
        </div>
        <dl className="wp-facts">
          <div>
            <dt>体感</dt>
            <dd>{deg(current.feels)}</dd>
          </div>
          <div>
            <dt>湿度</dt>
            <dd>{current.humidity}%</dd>
          </div>
          <div>
            <dt>风速</dt>
            <dd>{Math.round(current.wind)} km/h</dd>
          </div>
          {today?.sunrise && (
            <div>
              <dt>日出</dt>
              <dd>{today.sunrise}</dd>
            </div>
          )}
          {today?.sunset && (
            <div>
              <dt>日落</dt>
              <dd>{today.sunset}</dd>
            </div>
          )}
        </dl>
      </section>

      <h3 className="wp-title">接下来 24 小时</h3>
      <ol className="wp-hours">
        {hours.map((h, i) => (
          <li key={h.time}>
            <span className="wp-hour">{i === 0 ? '现在' : hourLabel(h.time, offset)}</span>
            <WeatherIcon kind={kindOf(h.code)} day={h.day} size={24} />
            <span>{deg(h.temp)}</span>
            {/* 降水概率：有可能下雨时才写 */}
            <span className="wp-pop">{h.pop ? `${h.pop}%` : ''}</span>
          </li>
        ))}
      </ol>

      <h3 className="wp-title">{days.length} 天预报</h3>
      <ul className="wp-days">
        {days.map((d) => (
          <li key={d.time}>
            <span className="wp-day">{weekdayLabel(d.time, now, offset)}</span>
            <span className="wp-date">{dateLabel(d.time, offset)}</span>
            <WeatherIcon kind={kindOf(d.code)} day size={22} />
            <span className="wp-text">{d.text}</span>
            <span className="weather-min">{deg(d.min)}</span>
            <span className="weather-range" aria-hidden="true">
              <span style={{ left: `${((d.min - lo) / span) * 100}%`, right: `${((lo + span - d.max) / span) * 100}%` }} />
            </span>
            <span className="weather-max">{deg(d.max)}</span>
          </li>
        ))}
      </ul>
    </PanelDialog>
  );
}

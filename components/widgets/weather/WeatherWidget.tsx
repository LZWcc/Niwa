import { useState } from 'react';
import { useWeather } from '@/hooks/useWeather';
import { daysFrom, deg, describe, hourLabel, weekdayLabel } from '@/utils/weather';
import type { WidgetProps } from '../types';
import WidgetFrame from '../WidgetFrame';
import WidgetHeader from '../WidgetHeader';
import PlaceDialog from './PlaceDialog';
import WeatherIcon from './WeatherIcon';

// 天气：点阵面板里是现在的温度和天气；中尺寸加接下来几小时，大尺寸再加体感、湿度、风和接下来几天。
// 数据钩子只在这个小组件存在时挂载，没选城市时不联网。

export default function WeatherWidget({ widget, frame, now }: WidgetProps) {
  const { size } = widget;
  const weather = useWeather(now);
  const { place, forecast, error, loading } = weather;
  const [dialogOpen, setDialogOpen] = useState(false);

  const menu = (
    <>
      {place && (
        <button type="button" role="menuitem" className="menu-item" onClick={() => void weather.refresh()}>
          立即刷新
        </button>
      )}
      <button type="button" role="menuitem" className="menu-item" onClick={() => setDialogOpen(true)}>
        {place ? '更换城市…' : '选择城市…'}
      </button>
    </>
  );

  let body;
  if (!place) {
    body = (
      <div className="weather-empty">
        <p>选一个城市，看那里的天气。</p>
        <button type="button" className="btn btn-primary" onClick={() => setDialogOpen(true)}>
          选择城市
        </button>
      </div>
    );
  } else if (!forecast) {
    body = <p className="weather-note">{error ?? '读取中…'}</p>;
  } else {
    const { current, offset } = forecast;
    const desc = describe(current.code);
    const days = daysFrom(forecast, now);
    const today = days[0];
    const hours = forecast.hours.filter((h) => h.time > now.getTime() - 3_600_000).slice(0, size === 'l' ? 6 : 5);
    // 每日的温度条按这几天里的最低、最高温度对齐
    const shownDays = days.slice(0, 5);
    const lo = Math.min(...shownDays.map((d) => d.min));
    const span = Math.max(...shownDays.map((d) => d.max)) - lo || 1;

    body = (
      <div className="weather-body">
        <div className="weather-panel widget-panel is-dotted">
          <WeatherIcon kind={desc.kind} day={current.day} size={size === 'l' ? 56 : 44} className="weather-now-icon" />
          <span className="weather-temp">{deg(current.temp)}</span>
          <span className="weather-desc">
            {desc.label}
            {today && ` · ${deg(today.max)} / ${deg(today.min)}`}
          </span>
          {size === 'l' && (
            <span className="weather-extra">
              体感 {deg(current.feels)} · 湿度 {current.humidity}% · 风 {Math.round(current.wind)} km/h
            </span>
          )}
        </div>

        {size !== 's' && (
          <ol className="weather-hours">
            {hours.map((h) => (
              <li key={h.time}>
                <span className="weather-hour">{hourLabel(h.time, now, offset)}</span>
                <WeatherIcon kind={describe(h.code).kind} day={h.day} size={24} />
                <span>{deg(h.temp)}</span>
              </li>
            ))}
          </ol>
        )}

        {size === 'l' && (
          <ul className="weather-days">
            {shownDays.map((d) => (
              <li key={d.time}>
                <span className="weather-day">{weekdayLabel(d.time, now, offset)}</span>
                <WeatherIcon kind={describe(d.code).kind} day size={20} />
                <span className="weather-min">{deg(d.min)}</span>
                <span className="weather-range" aria-hidden="true">
                  <span style={{ left: `${((d.min - lo) / span) * 100}%`, right: `${((lo + span - d.max) / span) * 100}%` }} />
                </span>
                <span className="weather-max">{deg(d.max)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const status = loading ? '更新中…' : error && forecast ? '更新失败' : '';
  return (
    <>
      <WidgetFrame widget={widget} frame={frame} menu={menu}>
        <div className={`weather weather-${size}`}>
          <WidgetHeader
            title="天气"
            meta={
              place && (
                <span className="weather-place" title={error ?? undefined}>
                  {place.name}
                  {status && ` · ${status}`}
                </span>
              )
            }
          />
          {body}
        </div>
      </WidgetFrame>
      <PlaceDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onPick={(p) => {
          weather.setPlace(p);
          setDialogOpen(false);
        }}
      />
    </>
  );
}

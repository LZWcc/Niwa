import { useLayoutEffect, useState } from 'react';
import { WEATHER } from '@/config';
import { useStoredText } from '@/hooks/useStored';
import { useWeather } from '@/hooks/useWeather';
import { preview } from '@/utils/preview';
import { KEYS } from '@/utils/storage';
import { applySceneWeather, daysFrom, deg, hourLabel, kindOf, sceneOf, weekdayLabel } from '@/utils/weather';
import type { WidgetProps } from '../types';
import WidgetFrame from '../WidgetFrame';
import WidgetHeader from '../WidgetHeader';
import WeatherDialog from './WeatherDialog';
import WeatherIcon from './WeatherIcon';

// 天气：点阵面板里是现在的温度和天气；中尺寸加接下来几小时，大尺寸再加体感、湿度、风和接下来几天。
// 数据来自和风天气，用户自己填 API Host 和 KEY。数据钩子只在这个小组件存在时挂载，没填 KEY、没选城市时不联网。
// 每个天气小组件各选各的城市（settings.place），和风的 KEY 共用。
// 菜单里可以打开「背景跟随天气」：阴、雾、雨、雪时背景跟着变（只有天气小组件在时才跟随，放了几个时跟最靠左上的那个）。

export default function WeatherWidget({ widget, frame, now, settings, onSettings, first }: WidgetProps) {
  const { size } = widget;
  const weather = useWeather(now, settings.place ?? null);
  const { account, place, forecast, error, loading } = weather;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sceneSetting, setSceneSetting] = useStoredText(KEYS.sceneWeather);
  const sceneOn = sceneSetting === 'on';

  // 在绘制前写好，打开页面时背景不会先晴后雨；小组件移除时背景恢复。
  const fresh = forecast && now.getTime() - weather.fetchedAt < WEATHER.sceneMaxAge;
  const scene = first ? (preview.weather ?? (sceneOn && fresh ? sceneOf(kindOf(forecast.current.code)) : null)) : null;
  useLayoutEffect(() => {
    if (!first) return;
    applySceneWeather(scene);
    return () => applySceneWeather(null);
  }, [scene, first]);

  const menu = (
    <>
      {place && (
        <button type="button" role="menuitem" className="menu-item" onClick={() => void weather.refresh()}>
          立即刷新
        </button>
      )}
      <button type="button" role="menuitem" className="menu-item" onClick={() => setDialogOpen(true)}>
        天气设置…
      </button>
      {place && (
        <button
          type="button"
          role="menuitemcheckbox"
          aria-checked={sceneOn}
          className="menu-item"
          onClick={() => setSceneSetting(sceneOn ? null : 'on')}
        >
          背景跟随天气
        </button>
      )}
    </>
  );

  let body;
  if (!account || !place) {
    body = (
      <div className="weather-empty">
        <p>{account ? '选一个城市，看那里的天气。' : '天气来自和风天气，先填写你的免费 KEY，再选城市。'}</p>
        <button type="button" className="btn btn-primary" onClick={() => setDialogOpen(true)}>
          {account ? '选择城市' : '设置天气'}
        </button>
      </div>
    );
  } else if (!forecast) {
    body = <p className="weather-note">{error ?? '读取中…'}</p>;
  } else {
    const { current, offset } = forecast;
    const days = daysFrom(forecast, now);
    const today = days[0];
    // 第一格是现在（实况），后面接逐小时预报
    const hours = [
      { time: now.getTime(), temp: current.temp, code: current.code, day: current.day },
      ...forecast.hours.filter((h) => h.time > now.getTime()),
    ].slice(0, size === 'l' ? 6 : 5);
    // 每日的温度条按这几天里的最低、最高温度对齐
    const shownDays = days.slice(0, 5);
    const lo = Math.min(...shownDays.map((d) => d.min));
    const span = Math.max(...shownDays.map((d) => d.max)) - lo || 1;

    body = (
      <div className="weather-body">
        <div className="weather-panel widget-panel is-dotted">
          <WeatherIcon kind={kindOf(current.code)} day={current.day} size={size === 'l' ? 56 : 44} className="weather-now-icon" />
          <span className="weather-temp">{deg(current.temp)}</span>
          <span className="weather-desc">
            {current.text}
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
            {hours.map((h, i) => (
              <li key={h.time}>
                <span className="weather-hour">{i === 0 ? '现在' : hourLabel(h.time, offset)}</span>
                <WeatherIcon kind={kindOf(h.code)} day={h.day} size={24} />
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
                <WeatherIcon kind={kindOf(d.code)} day size={20} />
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
                <span className="weather-place" title={error ?? '天气数据来自和风天气'}>
                  {place.name}
                  {status && ` · ${status}`}
                </span>
              )
            }
          />
          {body}
        </div>
      </WidgetFrame>
      <WeatherDialog
        open={dialogOpen}
        weather={weather}
        onPick={(place) => onSettings(() => ({ place }))}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}

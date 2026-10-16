import { useState } from 'react';
import { WORLD_CLOCK } from '@/config';
import { CITY_BY_ID, subsolar, sunAltitude, zoneDiff, zoneTime } from '@/utils/worldclock';
import type { WidgetProps } from '../types';
import WeatherIcon from '../weather/WeatherIcon';
import WidgetFrame from '../WidgetFrame';
import WidgetHeader from '../WidgetHeader';
import CitiesDialog from './CitiesDialog';
import WorldMap from './WorldMap';

// 世界时钟：几个城市的当地时间、和本地差几小时、那边是白天还是夜里；中、大尺寸加一张昼夜分明的点阵地图。
// 城市存在自己的 settings.cities（放几个世界时钟就各选各的），没选过时用默认的几个。不联网。

/** 各尺寸放几个城市 */
const ROWS = { s: 3, m: 3, l: 8 };

export default function WorldClockWidget({ widget, frame, now, settings, onSettings }: WidgetProps) {
  const { size } = widget;
  const [dialogOpen, setDialogOpen] = useState(false);
  const cities = (settings.cities ?? WORLD_CLOCK.defaults).flatMap((id) => CITY_BY_ID.get(id) ?? []);
  const sun = subsolar(now.getTime());

  const list = (
    <ul className="wc-list">
      {cities.slice(0, ROWS[size]).map((c) => {
        const day = sunAltitude(c.lat, c.lon, sun) > 0;
        return (
          <li key={c.id} className="wc-row">
            <span className="wc-place">
              <span className="wc-name">{c.name}</span>
              <span className="wc-diff">{zoneDiff(c.zone, now)}</span>
            </span>
            <span className="wc-now" title={day ? '那边是白天' : '那边是夜里'}>
              <WeatherIcon kind="clear" day={day} size={16} />
              <span className="wc-time">{zoneTime(c.zone, now)}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <WidgetFrame
        widget={widget}
        frame={frame}
        menu={
          <button type="button" role="menuitem" className="menu-item" onClick={() => setDialogOpen(true)}>
            选择城市…
          </button>
        }
      >
        <div className={`wc wc-${size}`}>
          <WidgetHeader title="世界时钟" meta={cities.length > ROWS[size] && `${cities.length} 个城市`} />
          {cities.length === 0 ? (
            <div className="wc-empty">
              <p>还没有城市。</p>
              <button type="button" className="btn btn-primary" onClick={() => setDialogOpen(true)}>
                选择城市
              </button>
            </div>
          ) : (
            <div className="wc-body">
              {size !== 's' && (
                <div className="wc-panel widget-panel">
                  <WorldMap now={now} cities={cities} />
                </div>
              )}
              {list}
            </div>
          )}
        </div>
      </WidgetFrame>
      <CitiesDialog
        open={dialogOpen}
        cities={cities}
        onChange={(ids) => onSettings(() => ({ cities: ids }))}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}

import type { City } from '@/config';
import { subsolar, sunAltitude } from '@/utils/worldclock';
import { LAND, MAP } from '@/utils/worldmap';

// 陆地上每一格的位置和格子中心的经纬度，算一次就够
const DOTS = LAND.flatMap((row, y) =>
  [...row].flatMap((cell, x) =>
    cell === '#' ? [{ x, y, lat: MAP.top - MAP.step * (y + 0.5), lon: MAP.left + MAP.step * (x + 0.5) }] : [],
  ),
);

// 点阵世界地图：白天的地方亮、夜里暗、中间一圈晨昏，城市标成小圆圈。
export default function WorldMap({ now, cities }: { now: Date; cities: City[] }) {
  const sun = subsolar(now.getTime());
  return (
    <svg className="wc-map" viewBox={`0 0 ${MAP.cols} ${MAP.rows}`} role="img" aria-label="世界地图，标出了白天和夜里">
      {DOTS.map((d) => {
        const alt = sunAltitude(d.lat, d.lon, sun);
        return (
          <circle
            key={`${d.x},${d.y}`}
            className={alt > 0 ? 'is-day' : alt > -6 ? 'is-dusk' : 'is-night'}
            cx={d.x + 0.5}
            cy={d.y + 0.5}
            r={0.34}
          />
        );
      })}
      {cities.map((c) => (
        <circle key={c.id} className="wc-city" cx={(c.lon - MAP.left) / MAP.step} cy={(MAP.top - c.lat) / MAP.step} r={0.9}>
          <title>{c.name}</title>
        </circle>
      ))}
    </svg>
  );
}

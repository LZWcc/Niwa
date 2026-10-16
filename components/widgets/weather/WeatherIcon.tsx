import type { WeatherKind } from '@/utils/weather';

type Props = { kind: WeatherKind; day: boolean; size: number; className?: string };

// 天气图标：和背景的山水一样是平涂的形状，颜色是 --w-* 变量（深色时换一套）。夜里晴天是月亮。
export default function WeatherIcon({ kind, day, size, className }: Props) {
  const orb = day ? (
    <circle className="wi-sun" cx="0" cy="0" r="10" />
  ) : (
    <path className="wi-moon" d="M3-10A10.5 10.5 0 1 0 10 6 8.5 8.5 0 0 1 3-10z" />
  );
  return (
    <svg
      className={className ? `weather-icon ${className}` : 'weather-icon'}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      {kind === 'clear' && <g transform="translate(24 24)">{orb}</g>}
      {kind === 'partly' && <g transform="translate(30 17) scale(0.8)">{orb}</g>}
      {kind === 'cloudy' && (
        <g className="wi-cloud-back" transform="translate(7 -6)">
          <circle cx="22" cy="25" r="7" />
          <circle cx="29" cy="27" r="5" />
          <rect x="15" y="26" width="20" height="6" rx="3" />
        </g>
      )}
      {kind === 'fog' ? (
        <path className="wi-line" d="M10 19h28M14 26h24M10 33h22" />
      ) : (
        kind !== 'clear' && (
          <g className="wi-cloud">
            <circle cx="18" cy="29" r="7" />
            <circle cx="26" cy="24" r="9" />
            <circle cx="33" cy="30" r="6" />
            <rect x="11" y="29" width="28" height="8" rx="4" />
          </g>
        )
      )}
      {kind === 'rain' && <path className="wi-line wi-rain" d="M17 41l-2 4M24 41l-2 4M31 41l-2 4" />}
      {kind === 'drizzle' && <path className="wi-line wi-rain" d="M20 41l-1 3M29 41l-1 3" />}
      {kind === 'snow' && (
        <g className="wi-snow">
          <circle cx="17" cy="43" r="1.7" />
          <circle cx="24" cy="44.5" r="1.7" />
          <circle cx="31" cy="43" r="1.7" />
        </g>
      )}
      {kind === 'thunder' && <path className="wi-sun" d="M25 35l-5 7h4l-2 5 7-8h-4l2-4z" />}
    </svg>
  );
}

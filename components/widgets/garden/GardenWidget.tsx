import { useVisits } from '@/hooks/useVisits';
import { almanac, phaseOf } from '@/utils/almanac';
import { preview } from '@/utils/preview';
import type { WidgetProps } from '../types';
import WidgetFrame from '../WidgetFrame';
import Garden, { MILESTONES } from './Garden';

// 庭：累计打开的天数越多，砂盘里的东西越多；随季节换装，随时辰明暗。

function hint(days: number) {
  if (days === 1) return '每天来看看，它会慢慢生长';
  const next = MILESTONES.find((m) => m.day > days);
  return next ? `第 ${next.day} 日，会多出${next.label}` : '它会随四季变化';
}

export default function GardenWidget({ widget, frame, now }: WidgetProps) {
  const { size } = widget;
  const { visits, today } = useVisits(now);
  const days = preview.days ?? visits.days;
  const season = preview.season ?? almanac(now).season;
  const phase = preview.phase ?? phaseOf(now);

  return (
    <WidgetFrame widget={widget} frame={frame}>
      <div className={`garden-widget garden-${size}`} aria-label={`你的庭，第 ${days} 日。${hint(days)}`}>
        {/* 种子带上日期：同一天里布局稳定，换一天落物的位置会变 */}
        <Garden days={days} seed={`${visits.first}/${today}`} season={season} phase={phase} />
        <div className="garden-text">
          {size === 'm' && <h2 className="widget-title">庭</h2>}
          <p className="garden-day">第 {days} 日</p>
          {size !== 's' && <p className="garden-hint">{hint(days)}</p>}
        </div>
      </div>
    </WidgetFrame>
  );
}

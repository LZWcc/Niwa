import { useVisits } from '@/hooks/useVisits';
import { almanac, phaseOf } from '@/utils/almanac';
import { preview } from '@/utils/preview';
import type { WidgetProps } from '../types';
import WidgetFrame from '../WidgetFrame';
import WidgetHeader from '../WidgetHeader';
import type { Pentad } from '@/utils/pentads';
import Garden, { MILESTONES } from './Garden';
import { PENTAD_SCENES } from './scenes';

// 庭：累计打开的天数越多，砂盘里的东西越多；随季节换装，随时辰明暗，每一候（五天）添一点那几天的物候。

/** 下面的提示：还在长的时候说下一次多出什么，长齐了说这一候是什么景 */
function hint(days: number, pentad: Pentad) {
  if (days === 1) return '每天来看看，它会慢慢生长';
  const next = MILESTONES.find((m) => m.day > days);
  return next ? `第 ${next.day} 日，会多出${next.label}` : `${pentad}：${PENTAD_SCENES[pentad].caption}`;
}

export default function GardenWidget({ widget, frame, now }: WidgetProps) {
  const { size } = widget;
  const { visits, today } = useVisits(now);
  const days = preview.days ?? visits.days;
  const season = preview.season ?? almanac(now).season;
  const phase = preview.phase ?? phaseOf(now);
  const pentad = preview.pentad ?? almanac(now).pentad;

  return (
    <WidgetFrame widget={widget} frame={frame}>
      <div className={`garden-widget garden-${size}`} aria-label={`你的庭，第 ${days} 日。${hint(days, pentad)}`}>
        <WidgetHeader title="庭" meta={`第 ${days} 日`} />
        <div className="garden-body">
          <div className="garden-panel widget-panel is-dotted">
            {/* 种子带上日期：同一天里布局稳定，换一天落物的位置会变 */}
            <Garden days={days} seed={`${visits.first}/${today}`} season={season} phase={phase} pentad={pentad} />
          </div>
          {size !== 's' && <p className="garden-hint">{hint(days, pentad)}</p>}
        </div>
      </div>
    </WidgetFrame>
  );
}

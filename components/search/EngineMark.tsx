import { faviconUrl } from '@/utils/icons/model';
import { presetOf, type Engine } from '@/utils/search/engines';

// 固定宽度的圆形标记，引擎名长短不影响布局。内置的是打包的单色图标（或几个字）、按引擎的颜色着色；
// 自己加的用浏览器缓存的网站图标（不联网，没访问过那个网站时是浏览器的默认图标）。
export default function EngineMark({ engine }: { engine: Engine }) {
  const preset = presetOf(engine);
  if (preset?.icon || preset?.mark) {
    return (
      <span
        className={preset.icon ? 'engine-mark' : 'engine-mark is-text'}
        // 字写在 data-mark 里由 CSS 画出来，不算进按钮的文字（读屏、textContent 只有引擎名）
        data-mark={preset.mark}
        style={{ '--mark': preset.color, '--icon': preset.icon && `url(/engines/${preset.icon}.svg)` } as React.CSSProperties}
        aria-hidden="true"
      />
    );
  }
  return (
    <span className="engine-mark is-site" aria-hidden="true">
      <img src={faviconUrl(new URL(engine.url.replace('%s', '')).origin, 32)} alt="" />
    </span>
  );
}

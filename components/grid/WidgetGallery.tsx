import { useMemo, useState, type PointerEvent } from 'react';
import Dialog from '@/components/common/Dialog';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { WIDGET_COMPONENTS } from '@/components/widgets';
import { SampleContext } from '@/hooks/useSample';
import type { Point } from '@/utils/grid/items';
import { sampleSettings } from '@/utils/sample';
import { SIZE_NAMES, SIZE_ORDER, WIDGETS, WIDGET_TYPES, type WidgetSize, type WidgetType } from '@/utils/widgets';

type Props = {
  open: boolean;
  now: Date;
  onAdd: (type: WidgetType, size: WidgetSize) => void;
  /** 从预览上拖出来：放到网格上接着拖。指针在 (x, y)，grab 是按下的点在卡片里的位置 */
  onDragOut: (type: WidgetType, size: WidgetSize, x: number, y: number, grab: Point) => void;
  onClose: () => void;
};

const THRESHOLD = 4; // 和网格一样：按下后移动超过这么多像素才算拖动
const noop = () => {};

// 小组件库（参照 iPhone 的小组件库）：左边列出所有小组件，右边是选中的那个按所选尺寸的预览，
// 点「添加」放到网格最后，或者直接把预览拖到页面上想放的位置。
// 预览就是真的小组件，放在 SampleContext 里用演示数据画（见 hooks/useSample.ts），inert：不能点、不能聚焦。
export default function WidgetGallery({ open, now, onAdd, onDragOut, onClose }: Props) {
  const [type, setType] = useState<WidgetType>(WIDGET_TYPES[0]!);
  const [size, setSize] = useState<WidgetSize>(WIDGETS[type].defaultSize);
  // 换一种时定下演示设置（计时器从这一刻往前算）
  const settings = useMemo(() => sampleSettings(type, Date.now()), [type]);
  const Widget = WIDGET_COMPONENTS[type];

  const choose = (t: WidgetType) => {
    setType(t);
    setSize(WIDGETS[t].defaultSize);
  };

  // 预览是 inert 的，指针事件落在外面的台子上：按在卡片上、移动超过阈值，就交给网格接着拖
  const press = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || e.pointerType === 'touch') return;
    const card = e.currentTarget.querySelector('.widget')?.getBoundingClientRect();
    if (!card || e.clientX < card.left || e.clientX > card.right || e.clientY < card.top || e.clientY > card.bottom) return;
    e.preventDefault();
    const grab = { x: e.clientX - card.left, y: e.clientY - card.top };
    const [startX, startY] = [e.clientX, e.clientY];
    const move = (m: globalThis.PointerEvent) => {
      if (Math.hypot(m.clientX - startX, m.clientY - startY) <= THRESHOLD) return;
      stop();
      onDragOut(type, size, m.clientX, m.clientY, grab);
    };
    const stop = () => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', stop);
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', stop);
  };

  return (
    <Dialog open={open} onClose={onClose} className="dialog gallery-dialog" labelledBy="gallery-title">
      <div className="gallery">
        <nav className="gallery-list" aria-labelledby="gallery-title">
          <h2 id="gallery-title">小组件</h2>
          {WIDGET_TYPES.map((t) => (
            <button key={t} type="button" className="gallery-item" aria-pressed={t === type} onClick={() => choose(t)}>
              {WIDGETS[t].name}
            </button>
          ))}
        </nav>

        <section className="gallery-detail" aria-label={WIDGETS[type].name}>
          <div className="gallery-stage" onPointerDown={press}>
            {open && (
              <SampleContext value>
                <div className="gallery-preview" inert>
                  <ErrorBoundary key={type} fallback={() => <p className="gallery-note">预览出错了，添加后可以正常使用</p>}>
                    <Widget
                      widget={{ id: `sample-${type}`, kind: 'widget', type, size, settings }}
                      frame={{ style: {}, lifted: false, onResize: noop, onRemove: noop }}
                      now={now}
                      settings={settings}
                      onSettings={noop}
                      first={false}
                    />
                  </ErrorBoundary>
                </div>
              </SampleContext>
            )}
          </div>

          <div className="gallery-info">
            <div>
              <h3>{WIDGETS[type].name}</h3>
              <p>{WIDGETS[type].desc}</p>
            </div>
            <div
              className="segmented"
              role="radiogroup"
              aria-label="尺寸"
              style={{ '--i': SIZE_ORDER.indexOf(size) } as React.CSSProperties}
            >
              {SIZE_ORDER.map((s) => (
                <button key={s} type="button" role="radio" aria-checked={s === size} onClick={() => setSize(s)}>
                  {SIZE_NAMES[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="dialog-actions gallery-actions">
            <span className="gallery-hint">也可以把预览直接拖到页面上</span>
            <button type="button" className="btn btn-primary gallery-add" onClick={() => onAdd(type, size)}>
              添加
            </button>
          </div>
        </section>
      </div>
    </Dialog>
  );
}

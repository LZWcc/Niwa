import { WIDGETS } from '@/utils/widgets';
import type { WidgetItem } from '@/utils/grid/items';
import type { FrameProps } from './types';
import WidgetFrame from './WidgetFrame';

// 小组件出错时顶替它的卡片：保留外框（还能改尺寸、移除），里面提示出错并可以重试。
export default function WidgetError({ widget, frame, onRetry }: { widget: WidgetItem; frame: FrameProps; onRetry: () => void }) {
  return (
    <WidgetFrame widget={widget} frame={frame}>
      <div className="widget-error" role="alert">
        <p>{WIDGETS[widget.type].name}出错了</p>
        <button type="button" className="btn" onClick={onRetry}>
          重试
        </button>
      </div>
    </WidgetFrame>
  );
}

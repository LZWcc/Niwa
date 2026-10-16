import type { CSSProperties } from 'react';
import type { WidgetItem } from '@/utils/grid/items';
import type { WidgetSize } from '@/utils/widgets';

/** 网格交给外框的东西：位置、是否被拿起，以及改尺寸、移除的回调。 */
export type FrameProps = {
  style: CSSProperties;
  lifted: boolean;
  onResize: (size: WidgetSize) => void;
  onRemove: () => void;
};

/** 每个小组件收到的参数：自己的数据、外框参数、当前时间（每分钟更新）。 */
export type WidgetProps = {
  widget: WidgetItem;
  frame: FrameProps;
  now: Date;
};

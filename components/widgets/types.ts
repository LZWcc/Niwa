import type { CSSProperties } from 'react';
import type { WidgetItem, WidgetSettings } from '@/utils/grid/items';
import type { WidgetSize } from '@/utils/widgets';

/** 网格交给外框的东西：位置、是否被拿起，以及改尺寸、移除的回调。 */
export type FrameProps = {
  style: CSSProperties;
  lifted: boolean;
  onResize: (size: WidgetSize) => void;
  onRemove: () => void;
};

/**
 * 每个小组件收到的参数：网格里自己这一项、外框参数、当前时间（每分钟更新）；
 * 自己的设置和数据（settings，没有时是空对象）和改它的方法（按当前的设置算出要改的那几项）；
 * first：是不是同一种里最靠左上的那个——只有它接管页面级的事（粘贴存便签、背景跟随天气），多个时不会抢。
 */
export type WidgetProps = {
  widget: WidgetItem;
  frame: FrameProps;
  now: Date;
  settings: WidgetSettings;
  onSettings: (change: (settings: WidgetSettings) => WidgetSettings) => void;
  first: boolean;
};

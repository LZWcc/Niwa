// 网格里的每一项：网站快捷方式和小组件放在同一个列表里（niwa:grid），自由摆放。
// 每一项记自己左上角的列 x、行 y（可以留空）；没有位置的由 layout.ts 的 resolve 补上。
import { isLinkIcon, type LinkIcon } from '../icons/model';
import { SIZE_NAMES, WIDGETS, WIDGET_SIZES, type WidgetSize, type WidgetType } from '../widgets';
import type { Size } from './layout';

type Pos = { x?: number; y?: number };
/** icon 没有时用浏览器缓存的网站图标或首字母（默认项、更早添加的） */
export type LinkItem = { id: string; kind: 'link'; name: string; url: string; icon?: LinkIcon } & Pos;
export type WidgetItem = { id: string; kind: 'widget'; type: WidgetType; size: WidgetSize } & Pos;
export type GridItem = LinkItem | WidgetItem;

/** 占几格：快捷方式 1×1，小组件按尺寸 */
export const sizeOf = (item: GridItem): Size => (item.kind === 'link' ? { w: 1, h: 1 } : WIDGET_SIZES[item.size]);

/** 网格里的一个格子位置（「添加」格子的位置用它） */
export type Point = { x: number; y: number };
export const isPoint = (v: unknown): v is Point => Number.isInteger((v as Point | null)?.x) && Number.isInteger((v as Point).y);

const isPos = (v: unknown) => v === undefined || (Number.isInteger(v) && (v as number) >= 0);

export const isGridItem = (v: unknown): v is GridItem => {
  const item = v as GridItem;
  if (typeof item?.id !== 'string' || !isPos(item.x) || !isPos(item.y)) return false;
  if (item.kind === 'link') {
    return typeof item.name === 'string' && typeof item.url === 'string' && (item.icon === undefined || isLinkIcon(item.icon));
  }
  return item.kind === 'widget' && item.type in WIDGETS && item.size in SIZE_NAMES;
};

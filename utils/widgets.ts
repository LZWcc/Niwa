// 小组件的目录：有哪几种、叫什么、默认多大。只有数据，不含界面；
// 界面在 components/widgets/，两边用同一个 WidgetType 对上。

import type { Size } from './grid/layout';

export type WidgetType = 'notes' | 'calendar' | 'garden' | 'bookmarks' | 'history';
export type WidgetSize = 's' | 'm' | 'l';

export const WIDGETS: Record<WidgetType, { name: string; desc: string; defaultSize: WidgetSize }> = {
  notes: { name: '便签', desc: '随手记下，点一下就复制', defaultSize: 'm' },
  calendar: { name: '日程', desc: '接下来的日程，支持 Google 日历', defaultSize: 's' },
  garden: { name: '庭', desc: '每天来看看，它会慢慢生长', defaultSize: 's' },
  bookmarks: { name: '收藏夹', desc: '按文件夹浏览浏览器里的收藏', defaultSize: 'm' },
  history: { name: '历史', desc: '最近看过、常去的网站', defaultSize: 'm' },
};

export const WIDGET_TYPES = Object.keys(WIDGETS) as WidgetType[];

/** 尺寸的显示名和占的格数（网格单位 80px）：小 2×2、中 4×2、大 4×4 */
export const SIZE_NAMES: Record<WidgetSize, string> = { s: '小', m: '中', l: '大' };
export const WIDGET_SIZES: Record<WidgetSize, Size> = { s: { w: 2, h: 2 }, m: { w: 4, h: 2 }, l: { w: 4, h: 4 } };
export const SIZE_ORDER = Object.keys(SIZE_NAMES) as WidgetSize[];

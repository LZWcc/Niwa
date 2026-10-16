// 便签的数据（存在网格里每个便签小组件的 settings.notes），最新的在前面。
import { hasStrings } from './storage';

export type Note = { id: string; text: string };

export const isNote = hasStrings('id', 'text');

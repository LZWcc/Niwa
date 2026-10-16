// 便签的数据（niwa:notes），最新的在前面。
import { hasStrings } from './storage';

export type Note = { id: string; text: string };

export const isNote = hasStrings('id', 'text');

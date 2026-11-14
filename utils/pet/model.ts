// 宠物存在 niwa:pet 里的数据：页面和设置面板一打开就要读，放在这里，和图片处理（sprite.ts）分开，没导入宠物时不加载那边。
import { hasStrings } from '../storage';

/**
 * 存在 niwa:pet 里：名字、有没有看向的两行、位置（宠物中心在窗口里的比例，窗口大小变了还在相对的地方）。
 * 图片在 IndexedDB 里；id 每次导入换一个，别的标签页看到 id 变了就重新读图片。
 */
export type Pet = { id: string; name: string; look: boolean; x: number; y: number };

export const isPet = (v: unknown): v is Pet => {
  const p = v as Pet;
  return hasStrings('id', 'name')(v) && typeof p.look === 'boolean' && typeof p.x === 'number' && typeof p.y === 'number';
};

/** 第一次导入时放在右下角 */
export const DEFAULT_SPOT = { x: 0.92, y: 0.85 };

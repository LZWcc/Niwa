// 开发时在地址后加参数预览不同状态，例如 ?days=30&season=winter&phase=night。正式构建里都是 null。
import type { Phase, Season } from './almanac';

const params = import.meta.env.DEV ? new URLSearchParams(location.search) : null;

export const preview = {
  /** 庭的天数 */
  days: Number(params?.get('days')) || null,
  season: (params?.get('season') as Season | null) ?? null,
  phase: (params?.get('phase') as Phase | null) ?? null,
};

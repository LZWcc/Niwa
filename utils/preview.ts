// 开发时在地址后加参数预览不同状态，例如 ?days=30&season=winter&phase=night&weather=rain&moon=0.25。正式构建里都是 null。
import type { Phase, Season } from './almanac';
import type { SceneWeather } from './weather';

const params = import.meta.env.DEV ? new URLSearchParams(location.search) : null;

export const preview = {
  /** 庭的天数 */
  days: Number(params?.get('days')) || null,
  season: (params?.get('season') as Season | null) ?? null,
  phase: (params?.get('phase') as Phase | null) ?? null,
  /** 月相：0 新月，0.25 上弦，0.5 满月，0.75 下弦 */
  moon: params?.has('moon') ? Number(params.get('moon')) : null,
  /** 背景的天气：cloudy、fog、drizzle、rain、snow */
  weather: (params?.get('weather') as SceneWeather | null) ?? null,
};

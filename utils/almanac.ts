import { DAY, WEEKDAYS } from './date';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Phase = 'dawn' | 'day' | 'dusk' | 'night';

// 二十四节气与七十二候。起始日期为公历近似值（误差约 ±1 天），足够用于展示。
const TERMS: ReadonlyArray<readonly [string, number, number, readonly [string, string, string]]> = [
  ['小寒', 1, 5, ['雁北乡', '鹊始巢', '雉始雊']],
  ['大寒', 1, 20, ['鸡始乳', '征鸟厉疾', '水泽腹坚']],
  ['立春', 2, 4, ['东风解冻', '蛰虫始振', '鱼陟负冰']],
  ['雨水', 2, 19, ['獭祭鱼', '候雁北', '草木萌动']],
  ['惊蛰', 3, 5, ['桃始华', '仓庚鸣', '鹰化为鸠']],
  ['春分', 3, 20, ['玄鸟至', '雷乃发声', '始电']],
  ['清明', 4, 4, ['桐始华', '田鼠化为鴽', '虹始见']],
  ['谷雨', 4, 20, ['萍始生', '鸣鸠拂其羽', '戴胜降于桑']],
  ['立夏', 5, 5, ['蝼蝈鸣', '蚯蚓出', '王瓜生']],
  ['小满', 5, 21, ['苦菜秀', '靡草死', '麦秋至']],
  ['芒种', 6, 5, ['螳螂生', '鵙始鸣', '反舌无声']],
  ['夏至', 6, 21, ['鹿角解', '蜩始鸣', '半夏生']],
  ['小暑', 7, 7, ['温风至', '蟋蟀居宇', '鹰始挚']],
  ['大暑', 7, 22, ['腐草为萤', '土润溽暑', '大雨时行']],
  ['立秋', 8, 7, ['凉风至', '白露降', '寒蝉鸣']],
  ['处暑', 8, 23, ['鹰乃祭鸟', '天地始肃', '禾乃登']],
  ['白露', 9, 7, ['鸿雁来', '玄鸟归', '群鸟养羞']],
  ['秋分', 9, 23, ['雷始收声', '蛰虫坯户', '水始涸']],
  ['寒露', 10, 8, ['鸿雁来宾', '雀入大水为蛤', '菊有黄华']],
  ['霜降', 10, 23, ['豺乃祭兽', '草木黄落', '蛰虫咸俯']],
  ['立冬', 11, 7, ['水始冰', '地始冻', '雉入大水为蜃']],
  ['小雪', 11, 22, ['虹藏不见', '天气上升', '闭塞而成冬']],
  ['大雪', 12, 7, ['鹖鴠不鸣', '虎始交', '荔挺出']],
  ['冬至', 12, 21, ['蚯蚓结', '麋角解', '水泉动']],
];

export function almanac(now: Date) {
  const year = now.getFullYear();
  const today = new Date(year, now.getMonth(), now.getDate());

  let index = TERMS.findLastIndex(([, m, d]) => new Date(year, m - 1, d) <= today);
  // 1 月 5 日之前仍属于上一年的冬至。
  if (index === -1) index = TERMS.length - 1;
  const [term, month, day, pentads] = TERMS[index]!;
  const start = new Date(today < new Date(year, month - 1, day) ? year - 1 : year, month - 1, day);

  const days = Math.round((today.getTime() - start.getTime()) / DAY);
  const season: Season =
    index >= 2 && index < 8 ? 'spring' : index >= 8 && index < 14 ? 'summer' : index >= 14 && index < 20 ? 'autumn' : 'winter';

  return {
    term,
    pentad: pentads[Math.min(2, Math.floor(days / 5))],
    season,
    date: `${now.getMonth() + 1}月${now.getDate()}日 星期${WEEKDAYS[now.getDay()]}`,
  };
}

/** 某一天是不是节气的第一天，是就返回节气名（月历用）。 */
export function solarTermOn(date: Date): string | undefined {
  return TERMS.find(([, m, d]) => m === date.getMonth() + 1 && d === date.getDate())?.[0];
}

export function phaseOf(now: Date): Phase {
  const h = now.getHours();
  if (h >= 5 && h < 8) return 'dawn';
  if (h >= 8 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'dusk';
  return 'night';
}

/** 季节与时辰写在 <html> 上，由 CSS 决定主色和天色。override 用于开发时预览。 */
export function applyAtmosphere(now: Date, override: { season?: Season | null; phase?: Phase | null } = {}) {
  const root = document.documentElement;
  root.dataset.season = override.season ?? almanac(now).season;
  root.dataset.phase = override.phase ?? phaseOf(now);
}

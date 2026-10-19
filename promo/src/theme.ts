// 宣传片里共用的颜色、字体和时间轴（帧，30fps）。

export const PAPER = '#eef0ee';
export const NIGHT = '#1a272e';
export const INK = '#26313b';
export const MUTED = '#5d6974';
export const MOON = '#eef1ec';
export const FONT = "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif";

/** 强调色：白天是太阳的朱红，夜里是月光的金 */
export const ACCENT = '#d9573f';
export const GOLD = '#e8c98a';

/** 各段从第几帧开始（顺序：片头、打开、小组件、入夜、庭、隐私、片尾） */
export const T = {
  intro: 0,
  open: 80,
  widgets: 170,
  dusk: 285,
  garden: 365,
  privacy: 485,
  outro: 560,
  end: 645,
};

/** 和配乐对拍的点（画面和 music.ts 共用）：格子一个个弹出、庭每长一次 */
export const POP = { start: T.widgets + 4, step: 3, count: 16 };
export const GROW = { start: T.garden + 14, step: 12, days: [1, 3, 5, 7, 14, 21, 30] };

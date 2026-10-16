// 浅色「山水」与深色「夜庭」。默认跟随系统；在页面上切换过就记住选择。
// 最终用哪一种写在 <html data-theme> 上，样式只看这个属性，不直接用 prefers-color-scheme。
import { prefersReducedMotion } from './spring';
import { KEYS } from './storage';

export type Theme = 'light' | 'dark';
/** 用户的选择：跟随系统，或固定一种 */
export type ThemeChoice = Theme | 'system';

/** 系统的浅色 / 深色，变化时派发 change 事件。 */
export const systemDark = matchMedia('(prefers-color-scheme: dark)');

export const systemTheme = (): Theme => (systemDark.matches ? 'dark' : 'light');

export const isThemeChoice = (v: unknown): v is ThemeChoice => v === 'light' || v === 'dark' || v === 'system';

export function readThemeChoice(): ThemeChoice {
  const saved = localStorage.getItem(KEYS.theme);
  return isThemeChoice(saved) ? saved : 'system';
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

// 切换时的日落月升。日月由东（左）向西（右）走：
//   1. 当前的日（月）顺着弧线落到右边的山后。这时页面别的都不变，只有它在动（只重绘它周围一小块）；
//   2. 落下去之后一次换好所有颜色，用 View Transition 把换之前、换之后的两张画面交叉淡入淡出。
//      逐个元素做颜色过渡会让整页每帧重算样式、重绘背景和毛玻璃，切换时明显卡顿；
//   3. 颜色换完，另一个从左边的山后沿弧线升起。不和第 2 步重叠：淡入淡出期间有东西在动，
//      浏览器会把背景拆成几块单独合成，在 macOS 上能隐约看到这些块的方框。
const SET = 650;
const FADE = 600; // 与 styles/tokens.css 里 .is-theming 的 View Transition 时长一致
const RISE = 950;
let switching = false;

/** 日月当前的中心点 */
function centerOf(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** 日月落下、升起的地平线：近山那一层，离底边山高的五分之一（山高同 scene.css 里的 min(36vh, 340px)）。深色没有山，也按这条线，到那里正好淡出。 */
function horizonY() {
  return innerHeight - Math.min(innerHeight * 0.36, 340) * 0.2;
}

/**
 * 沿四分之一椭圆弧的关键帧：改 scene.css 里的 --orb-dx / --orb-dy（相对原位置的位移）和 --orb-fade（淡入淡出）。
 * 落下：先横着走、再往下坠；升起：先往上、再横着停到位置上。
 */
function arc(dx: number, dy: number, direction: 'set' | 'rise') {
  const frames: Keyframe[] = [];
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = (t * Math.PI) / 2;
    // set：从 (0,0) 到 (dx,dy)；rise：从 (dx,dy) 到 (0,0)
    const [x, y] = direction === 'set' ? [dx * Math.sin(a), dy * (1 - Math.cos(a))] : [dx * Math.cos(a), dy * (1 - Math.sin(a))];
    // 靠近地平线的那一段淡入淡出：深色没有山挡着，也不会露出来
    const near = direction === 'set' ? t : 1 - t;
    frames.push({ '--orb-dx': `${x}px`, '--orb-dy': `${y}px`, '--orb-fade': near < 0.6 ? 1 : 1 - (near - 0.6) / 0.4 });
  }
  return frames;
}

/** 带日落月升地换到 theme；commit 在换颜色时调用（保存选择、更新界面）。减少动态效果时直接换。 */
export function switchTheme(theme: Theme, commit: () => void) {
  if (prefersReducedMotion()) {
    applyTheme(theme);
    commit();
    return;
  }
  if (switching) return;
  switching = true;
  const root = document.documentElement;
  const orb = document.querySelector<HTMLElement>('.scene-orb')!;

  // 落下：从当前位置落到右边地平线（窗口宽度的 92% 处），停在那里（透明）直到换完颜色。
  const from = centerOf(orb);
  orb.animate(arc(innerWidth * 0.92 - from.x, horizonY() - from.y, 'set'), {
    duration: SET,
    easing: 'cubic-bezier(0.4, 0, 0.8, 0.5)',
    fill: 'forwards',
  });

  setTimeout(() => {
    root.classList.add('is-theming');
    // 回调之前浏览器先截下当前画面（这时日月已经落下、看不见），回调之后的画面是新的。
    document.startViewTransition(() => {
      applyTheme(theme);
      commit();
      // 换完颜色之前先不露面：交叉淡入淡出期间页面里什么都不动，浏览器不会为了动的东西把背景拆成几层。
      for (const a of orb.getAnimations()) a.cancel();
      orb.style.setProperty('--orb-fade', '0');
    });
  }, SET);

  // 升起：颜色换完后，从左边地平线（窗口宽度的 8% 处）沿弧线升到新位置。
  setTimeout(() => {
    orb.style.removeProperty('--orb-fade');
    const to = centerOf(orb);
    orb.animate(arc(innerWidth * 0.08 - to.x, horizonY() - to.y, 'rise'), {
      duration: RISE,
      easing: 'cubic-bezier(0.2, 0.5, 0.3, 1)',
    });
  }, SET + FADE);

  // 用定时器而不是动画的 finished：标签页在后台时动画可能暂停，状态也要能复原。
  setTimeout(
    () => {
      root.classList.remove('is-theming');
      switching = false;
    },
    SET + FADE + RISE,
  );
}

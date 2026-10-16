// 弹簧动画：阻尼振子的解析解，采样成 CSS linear() 曲线，交给浏览器的 Web Animations 去跑，
// 不用每帧 setState。参数取自动效参考（ui-motion-lab 的 Claude Storybook 快照）。

export type Spring = { stiffness: number; damping: number; mass: number };

export const SPRINGS = {
  /** 按钮、小控件：紧，回弹很小 */
  button: { stiffness: 600, damping: 30, mass: 1 },
  /** 卡片、弹出层、网格重排：微冲后平稳落定 */
  card: { stiffness: 320, damping: 28, mass: 1 },
} satisfies Record<string, Spring>;

/** 从 0 到 1 的弹簧在第 t 秒的位置。 */
export function springAt({ stiffness: k, damping: c, mass: m }: Spring, t: number) {
  const w0 = Math.sqrt(k / m);
  const zeta = c / (2 * Math.sqrt(m * k));
  const x0 = -1;
  let x: number;
  if (zeta < 0.999) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    x = Math.exp(-zeta * w0 * t) * (x0 * Math.cos(wd * t) + ((zeta * w0 * x0) / wd) * Math.sin(wd * t));
  } else if (zeta <= 1.001) {
    x = Math.exp(-w0 * t) * (x0 + w0 * x0 * t);
  } else {
    const s = Math.sqrt(zeta * zeta - 1);
    const r1 = -w0 * (zeta - s);
    const r2 = -w0 * (zeta + s);
    const a = (-r2 * x0) / (r1 - r2);
    x = a * Math.exp(r1 * t) + (x0 - a) * Math.exp(r2 * t);
  }
  return 1 + x;
}

const cache = new Map<Spring, { easing: string; duration: number }>();

/** 弹簧对应的 linear() 曲线和时长（毫秒）：偏差小于 0.1% 就算落定。 */
export function springEasing(spring: Spring) {
  const hit = cache.get(spring);
  if (hit) return hit;
  const step = 1 / 60;
  const values: number[] = [];
  let settled = 0;
  for (let t = 0; t <= 2; t += step) {
    const v = springAt(spring, t);
    values.push(v);
    if (Math.abs(1 - v) > 0.001) settled = values.length;
  }
  const points = values.slice(0, settled + 1);
  points[points.length - 1] = 1;
  const result = {
    easing: `linear(${points.map((v) => +v.toFixed(4)).join(', ')})`,
    duration: Math.round(points.length * step * 1000),
  };
  cache.set(spring, result);
  return result;
}

export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

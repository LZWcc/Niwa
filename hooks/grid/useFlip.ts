import { useLayoutEffect, useRef, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { tiles } from '@/utils/grid/dom';
import { SPRINGS, prefersReducedMotion, springEasing } from '@/utils/spring';

// 网格的布局动画（FLIP）：改数据前记下每一格在屏幕上的位置，渲染后让它们从旧位置弹到新位置。
// 拖动、增删、改尺寸都经过这里，格子不会瞬间跳过去。正被拖着的那块（.is-lifted）由指针控制，不参与。

export function useFlip(grid: RefObject<HTMLElement | null>) {
  // 改动之前各格子在屏幕上的位置（相对网格），渲染后用完就清空。
  const before = useRef<Map<string, { x: number; y: number }> | null>(null);

  /** 先记下每一格现在的位置，再执行 change（改数据）；渲染后各格从旧位置弹到新位置。 */
  const animate = (change: () => void) => {
    const g = grid.current;
    if (g) {
      const base = g.getBoundingClientRect();
      const positions = new Map<string, { x: number; y: number }>();
      for (const el of tiles(g)) {
        // 用实际看到的位置：上一段动画还没跑完时，从当前位置接着走，不会跳。
        const r = el.getBoundingClientRect();
        positions.set(el.dataset.key!, { x: r.left - base.left, y: r.top - base.top });
      }
      before.current = positions;
    }
    // 记位置和提交必须在同一段同步代码里：pointermove 在一帧开头派发，
    // 若交给 React 稍后渲染，中间浏览器会先画一帧、动画往前走了，
    // 新动画再从旧位置起步，正在滑动的格子就会往回跳一下（快速连续换位时明显）。
    flushSync(change);
  };

  useLayoutEffect(() => {
    const prev = before.current;
    const g = grid.current;
    if (!prev || !g) return;
    before.current = null;
    if (prefersReducedMotion()) return;
    const { easing, duration } = springEasing(SPRINGS.card);
    for (const el of tiles(g)) {
      if (el.classList.contains('is-lifted')) continue;
      const from = prev.get(el.dataset.key!);
      if (!from) {
        // 新加的：轻轻放大出现
        el.animate(
          [
            { opacity: 0, transform: 'scale(.92)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration, easing },
        );
        continue;
      }
      for (const a of el.getAnimations()) a.cancel();
      const dx = from.x - el.offsetLeft;
      const dy = from.y - el.offsetTop;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration, easing });
    }
  });

  return animate;
}

import { useEffect, useRef, useState, type RefObject } from 'react';
import { layoutRect, suppressNextClick } from '@/utils/grid/dom';
import { SPRINGS, prefersReducedMotion, springEasing } from '@/utils/spring';

// 打开的文件夹里的拖动：按顺序排的一格格快捷方式，拖到哪一格就插到哪（其余的用 useFlip 滑过去）；
// 拖出面板就交给 onDragOut，由网格接着拖（useGridDrag 的 start）。按 Esc 恢复拖动前的顺序。

const THRESHOLD = 4; // 按下后移动超过这么多像素才算拖动，否则就是点击
const LIFT = 1.04;
const OUTSIDE = 12; // 指针离开面板这么远才算拖出去
// 名字输入框、编辑按钮上按下不拖
const BLOCKED = 'input, button:not(.shortcut-link)';

type Options = {
  /** 现在的顺序和每行几个 */
  ids: () => string[];
  cols: () => number;
  /** 采用新的顺序 */
  reorder: (ids: string[]) => void;
  /** useFlip 返回的 animate */
  animate: (change: () => void) => void;
  /** 拖出了面板，指针在 (x, y) */
  onDragOut: (id: string, x: number, y: number) => void;
};

type Drag = {
  id: string;
  el: HTMLElement;
  startX: number;
  startY: number;
  grabX: number;
  grabY: number;
  x: number;
  y: number;
  active: boolean;
  original: string[];
};

export function useFolderDrag(grid: RefObject<HTMLElement | null>, panel: RefObject<HTMLElement | null>, options: Options) {
  const [dragId, setDragId] = useState<string | null>(null);
  const opts = useRef(options);
  opts.current = options;

  useEffect(() => {
    const g = grid.current;
    if (!g) return;
    let s: Drag | null = null;

    const stick = (d: Drag) => {
      const home = layoutRect(g, d.el);
      d.el.style.transform = `translate(${d.x - d.grabX - home.left}px, ${d.y - d.grabY - home.top}px) scale(${LIFT})`;
    };

    /** 指针下面是第几格（超出范围的算最后一格） */
    const indexAt = (x: number, y: number) => {
      const style = getComputedStyle(g);
      const pitch = parseFloat(style.gridAutoRows) + parseFloat(style.columnGap);
      const base = g.getBoundingClientRect();
      const cols = opts.current.cols();
      const col = Math.max(0, Math.min(cols - 1, Math.floor((x - base.left) / pitch)));
      const row = Math.max(0, Math.floor((y - base.top) / pitch));
      return Math.min(opts.current.ids().length - 1, row * cols + col);
    };

    const stop = (d: Drag, { dropped }: { dropped: boolean }) => {
      s = null;
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerup', onUp);
      removeEventListener('pointercancel', onCancel);
      removeEventListener('keydown', onKey, true);
      if (!d.active) return;
      setDragId(null);
      document.documentElement.classList.remove('is-reordering');
      const from = d.el.style.transform;
      d.el.style.transform = '';
      if (from && dropped && !prefersReducedMotion()) {
        const { easing, duration } = springEasing(SPRINGS.card);
        d.el.animate([{ transform: from }, { transform: 'none' }], { duration, easing });
      }
      if (dropped) suppressNextClick();
    };

    const onMove = (e: PointerEvent) => {
      if (!s) return;
      s.x = e.clientX;
      s.y = e.clientY;
      if (!s.active && Math.hypot(s.x - s.startX, s.y - s.startY) > THRESHOLD) {
        s.active = true;
        const home = layoutRect(g, s.el);
        s.grabX = s.startX - home.left;
        s.grabY = s.startY - home.top;
        getSelection()?.removeAllRanges();
        document.documentElement.classList.add('is-reordering');
        setDragId(s.id);
      }
      if (!s.active) return;
      e.preventDefault();
      stick(s);
      // 拖出了面板：交给网格
      const p = panel.current!.getBoundingClientRect();
      if (s.x < p.left - OUTSIDE || s.x > p.right + OUTSIDE || s.y < p.top - OUTSIDE || s.y > p.bottom + OUTSIDE) {
        const d = s;
        stop(d, { dropped: false });
        opts.current.onDragOut(d.id, d.x, d.y);
        return;
      }
      const ids = opts.current.ids();
      const to = indexAt(s.x, s.y);
      if (ids[to] === s.id) return;
      const next = ids.filter((id) => id !== s!.id);
      next.splice(to, 0, s.id);
      opts.current.animate(() => opts.current.reorder(next));
      stick(s);
    };
    const onUp = () => s && stop(s, { dropped: true });
    const onCancel = () => s && stop(s, { dropped: false });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !s?.active) return;
      // 只取消拖动，不关文件夹
      e.preventDefault();
      e.stopPropagation();
      const d = s;
      opts.current.animate(() => opts.current.reorder(d.original));
      stop(d, { dropped: false });
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || e.pointerType === 'touch' || s) return;
      const target = e.target as Element;
      if (target.closest(BLOCKED)) return;
      const el = target.closest<HTMLElement>('[data-key]');
      if (!el || el.parentElement !== g) return;
      s = {
        id: el.dataset.key!,
        el,
        startX: e.clientX,
        startY: e.clientY,
        grabX: 0,
        grabY: 0,
        x: e.clientX,
        y: e.clientY,
        active: false,
        original: opts.current.ids(),
      };
      addEventListener('pointermove', onMove);
      addEventListener('pointerup', onUp);
      addEventListener('pointercancel', onCancel);
      addEventListener('keydown', onKey, true);
    };

    g.addEventListener('pointerdown', onDown);
    return () => {
      g.removeEventListener('pointerdown', onDown);
      if (s) stop(s, { dropped: false });
    };
    // 只在挂载时注册一次（文件夹面板里的网格一直在，关着时是空的）；参数通过 opts ref 读取最新值。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 正在拖的快捷方式的 id */
  return dragId;
}

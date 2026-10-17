import { useEffect, useRef, useState, type RefObject } from 'react';
import { layoutRect, suppressNextClick, tiles } from '@/utils/grid/dom';
import { sameLayout, stepDrag, type Layout } from '@/utils/grid/layout';
import { SPRINGS, prefersReducedMotion, springEasing } from '@/utils/spring';

// 网格拖拽：不用浏览器原生拖放（半透明残影、其他格子瞬间跳位），
// 而是让被拖的那块跟着指针走，其余格子由 useFlip 用弹簧滑到新位置。
//
// 一次拖动：按下（onDown）→ 移动超过 4px 才算开始（begin）→ 每次移动和每一帧都 update：
//   贴着指针（stick）、算出吸附到的格子（snapCell）、一格一格走过去决定摆放（stepDrag）
// → 松手或取消（finish）。按 Esc 恢复拖动前的摆放。
// 摆放规则全在 utils/layout.ts，这里只管指针和页面。
//
// 收纳文件夹（参照 Launchpad）：拖着快捷方式经过另一个快捷方式或文件夹的图标时先不换位（hold）；
// 在图标正中停够 MERGE_DWELL 就是要放进去（目标高亮），这时松手交给 onMerge；没停够就松手，照常互换。
// 停在图标边上 SWAP_DWELL 也照常换位，方便只想挪位置的时候。
// 从打开的文件夹里拖出来的，由文件夹面板交给 start，接着在网格上拖。

const THRESHOLD = 4; // 按下后移动超过这么多像素才算拖动，否则就是点击
const LIFT = 1.04; // 被拿起的那块放大一点
const EDGE = 72; // 指针离窗口上下边缘这么近时自动滚动
const COOLDOWN = 90; // 两次换位之间至少间隔（毫秒），让上一次的让位动画先开始
// 指针移动得快（像素/毫秒）时先不换位，等它慢下来再定位置：
// 快速划过几格时，中途经过的位置会引起大范围挤让，紧接着又复原，看起来就是闪一下。
const FAST = 0.6;
const PAUSE = 60; // 指针停这么久（毫秒）就算停住了
const MERGE_DWELL = 400; // 在别的图标正中停这么久（毫秒）就是要放进文件夹
const SWAP_DWELL = 200; // 停在别的图标边上这么久（毫秒）就照常换位
const MERGE_ZONE = 22; // 离图标中心这么近（像素）算“正中”
// 在这些元素上按下不触发拖动：输入框里要能选字，按钮要能点。快捷方式本身是链接、「添加」和文件夹本身是按钮，都可以拖。
// 小组件打开的对话框（月历、热榜）在 DOM 里也在卡片下面，在里面按下不拖动卡片。
const BLOCKED = 'input, textarea, select, button:not(.shortcut-add, .shortcut-link), [contenteditable], a:not(.shortcut-link), dialog';

type Options = {
  /** 当前的摆放和列数（取值函数：网格先调用这个钩子，摆放算好后才有值） */
  layout: () => Layout;
  cols: () => number;
  /** 采用新的摆放（拖动中实时更新，按 Esc 恢复拖动前的） */
  place: (layout: Layout) => void;
  /** useFlip 返回的 animate：改摆放时让其他格子滑过去 */
  animate: (change: () => void) => void;
  /** 拖着 id 能不能放进 target（快捷方式拖到快捷方式或文件夹上） */
  mergeable: (id: string, target: string) => boolean;
  /** 在 target 正中停够了再松手：把 id 放进去 */
  onMerge: (id: string, target: string) => void;
};

/** 一次拖动的状态。放在 ref 里，指针移动时直接改，不触发重新渲染。 */
type Drag = {
  id: string;
  el: HTMLElement;
  /** 按下的位置、指针在这块里按下的偏移、指针当前位置 */
  startX: number;
  startY: number;
  grabX: number;
  grabY: number;
  x: number;
  y: number;
  /** 指针速度（平滑后，像素/毫秒）和上次移动的时间 */
  speed: number;
  pointerAt: number;
  /** 移动超过阈值后才算真正开始拖 */
  active: boolean;
  /** 上次处理过的格子（"列,行"），没变就不重算；上次换位的时间 */
  cell: string;
  movedAt: number;
  /** 拖动开始时的摆放（按 Esc 恢复它）和列数（拖动中不变） */
  original: Layout;
  cols: number;
  /** 计算的起点：互换、整组搬移会累积进来，见 utils/layout 的 stepDrag */
  base: Layout;
  /** 上一次走到的格子：下一次从这里一格一格走到新的格子 */
  at: { x: number; y: number };
  frame: number;
  /** 虚线占位：标出松手后会落在哪里 */
  slot: HTMLDivElement | null;
  /** 指针停在哪个能放进去的图标上（先不换位）、从什么时候开始、在不在正中；停够了 ready，目标高亮 */
  hold: { id: string; el: HTMLElement; since: number; center: boolean; ready: boolean } | null;
};

/** 被拖那块的左上角吸附到哪个格子（挪过半格就算到了下一格）。 */
function snapCell(grid: HTMLElement, s: Drag) {
  const style = getComputedStyle(grid);
  const size = parseFloat(style.gridAutoRows);
  const gap = parseFloat(style.columnGap);
  const pitch = size + gap;
  const base = grid.getBoundingClientRect();
  const originX = base.left + (grid.clientWidth - (s.cols * pitch - gap)) / 2; // 列是居中的
  const self = s.original.get(s.id)!;
  // 最多拖到所有格子下面一行。
  const bottom = Math.max(0, ...[...s.original].filter(([key]) => key !== s.id).map(([, r]) => r.y + r.h));
  return {
    x: Math.max(0, Math.min(s.cols - self.w, Math.round((s.x - s.grabX - originX) / pitch))),
    y: Math.max(0, Math.min(bottom, Math.round((s.y - s.grabY - base.top) / pitch))),
  };
}

/** 指针下面能放进去的图标（按排版位置找，不受动画影响），和指针在不在它的正中。 */
function hovered(grid: HTMLElement, s: Drag, mergeable: Options['mergeable']) {
  for (const el of tiles(grid)) {
    const id = el.dataset.key!;
    if (id === s.id || !mergeable(s.id, id)) continue;
    const r = layoutRect(grid, el);
    if (s.x < r.left || s.x > r.left + r.width || s.y < r.top || s.y > r.top + r.height) continue;
    const icon = el.querySelector<HTMLElement>('.shortcut-icon')!;
    const cx = r.left + icon.offsetLeft + icon.offsetWidth / 2;
    const cy = r.top + icon.offsetTop + icon.offsetHeight / 2;
    return { id, el, center: Math.abs(s.x - cx) < MERGE_ZONE && Math.abs(s.y - cy) < MERGE_ZONE };
  }
  return null;
}

/** 不再停在那个图标上：去掉高亮 */
function release(s: Drag) {
  s.hold?.el.classList.remove('is-merge-target');
  s.el.classList.remove('is-merging');
  s.hold = null;
}

/** 记下指针新位置并更新速度：停顿过再动就从头算，否则平滑一下，免得单次抖动影响判断。 */
function trackPointer(s: Drag, e: PointerEvent) {
  const now = performance.now();
  const dt = Math.max(1, now - s.pointerAt);
  const v = Math.hypot(e.clientX - s.x, e.clientY - s.y) / dt;
  s.speed = dt > PAUSE ? v : s.speed * 0.5 + v * 0.5;
  s.pointerAt = now;
  s.x = e.clientX;
  s.y = e.clientY;
}

/** 按排版位置算偏移，让被拖的那块贴在指针下；占位框放到它的排版位置。 */
function stick(grid: HTMLElement, s: Drag) {
  const home = layoutRect(grid, s.el);
  s.el.style.transform = `translate(${s.x - s.grabX - home.left}px, ${s.y - s.grabY - home.top}px) scale(${LIFT})`;
  if (s.slot) s.slot.style.transform = `translate(${s.el.offsetLeft}px, ${s.el.offsetTop}px)`;
}

/** 虚线占位框，和被拖那块一样大，放在它的排版位置上。 */
function createSlot(el: HTMLElement) {
  const slot = document.createElement('div');
  slot.className = el.classList.contains('widget') ? 'grid-slot is-widget' : 'grid-slot';
  Object.assign(slot.style, {
    width: `${el.offsetWidth}px`,
    height: `${el.offsetHeight}px`,
    transform: `translate(${el.offsetLeft}px, ${el.offsetTop}px)`,
  });
  return slot;
}

export function useGridDrag(grid: RefObject<HTMLElement | null>, options: Options) {
  const [dragId, setDragId] = useState<string | null>(null);
  // 事件处理只注册一次，通过 ref 读到最新的参数。
  const opts = useRef(options);
  opts.current = options;
  const drag = useRef<Drag | null>(null);
  const startRef = useRef<(id: string, x: number, y: number) => void>(null);

  useEffect(() => {
    /** 让被拖的那块贴着指针，并看要不要换位。指针移动时和每一帧都会调用。 */
    const update = () => {
      const s = drag.current;
      const g = grid.current;
      if (!s?.active || !g) return;
      stick(g, s);
      const now = performance.now();

      // 停在能放进去的图标上：先不换位
      const over = hovered(g, s, opts.current.mergeable);
      if (over && (s.hold?.id !== over.id || s.hold.center !== over.center)) {
        release(s);
        s.hold = { ...over, since: now, ready: false };
      } else if (!over) release(s);
      if (s.hold) {
        const waited = now - s.hold.since;
        if (s.hold.center) {
          if (!s.hold.ready && waited >= MERGE_DWELL) {
            s.hold.ready = true;
            s.hold.el.classList.add('is-merge-target');
            s.el.classList.add('is-merging');
          }
          return;
        }
        if (waited < SWAP_DWELL) return;
      }
      relayout(s, g, now);
    };

    /** 按指针现在的位置换位。force：松手时不管冷却和速度，把还没换的换掉 */
    const relayout = (s: Drag, g: HTMLElement, now: number, force = false) => {
      const target = snapCell(g, s);
      const cell = `${target.x},${target.y}`;
      if (now - s.pointerAt > PAUSE) s.speed = 0;
      if (cell === s.cell || (!force && (now - s.movedAt < COOLDOWN || s.speed > FAST))) return;
      s.cell = cell;

      // 从上一次的格子一格一格走到这里；全程都不接受时保持上一个有效摆放。
      const step = stepDrag(s.base, s.id, s.at, target, s.cols);
      s.base = step.base;
      s.at = target;
      const next = step.layout;
      if (!next || sameLayout(next, opts.current.layout())) return;
      s.movedAt = now;
      opts.current.animate(() => opts.current.place(next));
      // 已同步提交，这块的排版位置变了，马上按新位置摆回指针下，不留一帧错位。
      stick(g, s);
    };

    // 每帧：靠近窗口上下边缘时自动滚动（越靠边越快）；换位后排版位置变了，也要跟上。
    const frame = () => {
      const s = drag.current;
      if (!s?.active) return;
      s.frame = requestAnimationFrame(frame);
      const edge = s.y < EDGE ? s.y - EDGE : s.y > innerHeight - EDGE ? s.y - (innerHeight - EDGE) : 0;
      if (edge) scrollBy(0, edge * 0.25);
      update();
    };

    const begin = (s: Drag, g: HTMLElement) => {
      s.active = true;
      for (const a of s.el.getAnimations()) a.cancel();
      const home = layoutRect(g, s.el);
      s.grabX = s.startX - home.left;
      s.grabY = s.startY - home.top;
      getSelection()?.removeAllRanges();
      s.slot = createSlot(s.el);
      g.append(s.slot);
      document.documentElement.classList.add('is-reordering');
      setDragId(s.id);
      s.frame = requestAnimationFrame(frame);
    };

    const finish = (s: Drag, { dropped }: { dropped: boolean }) => {
      drag.current = null;
      removeListeners();
      if (!s.active) return; // 没动过：是一次普通点击
      cancelAnimationFrame(s.frame);
      s.slot?.remove();
      document.documentElement.classList.remove('is-reordering');
      setDragId(null);
      const merge = dropped && s.hold?.ready ? s.hold.id : null;
      // 停在图标上还没换位就松手了：照常换过去
      if (dropped && s.hold && !merge && grid.current) {
        s.hold = null;
        relayout(s, grid.current, performance.now(), true);
      }
      release(s);
      if (merge) {
        s.el.style.transform = '';
        opts.current.onMerge(s.id, merge);
        suppressNextClick();
        return;
      }
      // 从指针下的位置弹回格子里。
      const from = s.el.style.transform;
      s.el.style.transform = '';
      if (from && !prefersReducedMotion()) {
        const { easing, duration } = springEasing(SPRINGS.card);
        s.el.animate([{ transform: from }, { transform: 'none' }], { duration, easing });
      }
      if (dropped) suppressNextClick();
    };

    const onMove = (e: PointerEvent) => {
      const s = drag.current;
      const g = grid.current;
      if (!s || !g) return;
      trackPointer(s, e);
      if (!s.active && Math.hypot(s.x - s.startX, s.y - s.startY) > THRESHOLD) begin(s, g);
      if (!s.active) return;
      e.preventDefault();
      update();
    };
    const onUp = () => drag.current && finish(drag.current, { dropped: true });
    const onCancel = () => drag.current && finish(drag.current, { dropped: false });
    const onKey = (e: KeyboardEvent) => {
      const s = drag.current;
      if (e.key !== 'Escape' || !s?.active) return;
      e.preventDefault();
      opts.current.animate(() => opts.current.place(s.original));
      finish(s, { dropped: false });
    };

    const removeListeners = () => {
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerup', onUp);
      removeEventListener('pointercancel', onCancel);
      removeEventListener('blur', onCancel);
      removeEventListener('keydown', onKey, true);
    };

    const addListeners = () => {
      addEventListener('pointermove', onMove);
      addEventListener('pointerup', onUp);
      addEventListener('pointercancel', onCancel);
      addEventListener('blur', onCancel);
      addEventListener('keydown', onKey, true);
    };

    /** 准备拖 el（还没开始，移动超过阈值才开始） */
    const prepare = (el: HTMLElement, x: number, y: number): Drag | null => {
      const layout = opts.current.layout();
      const self = layout.get(el.dataset.key!);
      if (!self) return null;
      return {
        id: el.dataset.key!,
        el,
        startX: x,
        startY: y,
        grabX: 0,
        grabY: 0,
        x,
        y,
        speed: 0,
        pointerAt: performance.now(),
        active: false,
        cell: '',
        movedAt: 0,
        original: layout,
        cols: opts.current.cols(),
        base: layout,
        at: { x: self.x, y: self.y },
        frame: 0,
        slot: null,
        hold: null,
      };
    };

    const onDown = (e: PointerEvent) => {
      const g = grid.current;
      // 只处理鼠标左键和触控板；触屏上按住滑动应当是滚动页面。
      if (!g || e.button !== 0 || e.pointerType === 'touch' || drag.current) return;
      const target = e.target as Element;
      if (target.closest(BLOCKED)) return;
      const el = target.closest<HTMLElement>('[data-key]');
      if (!el || el.parentElement !== g) return;
      drag.current = prepare(el, e.clientX, e.clientY);
      if (drag.current) addListeners();
    };

    // 从文件夹里拖出来的：已经放到网格上了，直接接着拖，图标中心对着指针
    startRef.current = (id, x, y) => {
      const g = grid.current;
      const el = g && tiles(g).find((t) => t.dataset.key === id);
      if (!g || !el || drag.current) return;
      const s = prepare(el, x, y);
      if (!s) return;
      drag.current = s;
      begin(s, g);
      const icon = el.querySelector<HTMLElement>('.shortcut-icon');
      s.grabX = el.offsetWidth / 2;
      s.grabY = icon ? icon.offsetTop + icon.offsetHeight / 2 : el.offsetHeight / 2;
      addListeners();
      update();
    };

    const g = grid.current;
    g?.addEventListener('pointerdown', onDown);
    return () => {
      g?.removeEventListener('pointerdown', onDown);
      if (drag.current) finish(drag.current, { dropped: false });
    };
    // 只在挂载时注册一次；参数通过 opts ref 读取最新值。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    /** 正在拖的那一项的 key（没在拖时为 null） */
    dragId,
    /** 接着拖网格上的 id（从文件夹里拖出来的），指针现在在 (x, y) */
    start: (id: string, x: number, y: number) => startRef.current?.(id, x, y),
  };
}

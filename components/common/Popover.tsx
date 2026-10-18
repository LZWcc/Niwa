import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  anchor: HTMLElement | null;
  /**
   * side：放在锚点所在小组件的右侧，放不下就左侧，再不行放下方；bottom-end：锚点下方右对齐；
   * 一个点（右键菜单）：放在这一点的右下方，放不下就翻到左边、上边。锚点只用来按 Esc 后放回焦点，点锚点里面也会关上
   */
  placement: 'side' | 'bottom-end' | { x: number; y: number };
  onClose: () => void;
  role?: string;
  label?: string;
  className?: string;
  children: ReactNode;
};

const MARGIN = 8;
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));

/**
 * 挂在 body 上、按视口定位的弹出层。小组件列会滚动、会裁切溢出内容，
 * 菜单和详情放在列里会被截断，所以统一放到页面最外层。
 */
export default function Popover({ anchor, placement, onClose, role = 'dialog', label, className = '', children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!anchor || !ref.current) return;
    const a = anchor.getBoundingClientRect();
    const { width: w, height: h } = ref.current.getBoundingClientRect();
    let left: number;
    let top: number;
    if (typeof placement === 'object') {
      left = placement.x + w > innerWidth - MARGIN ? placement.x - w : placement.x;
      top = placement.y + h > innerHeight - MARGIN ? placement.y - h : placement.y;
    } else if (placement === 'side') {
      // 横向避开整个小组件，纵向对齐被点的那一行。
      const box = (anchor.closest('.widget') ?? anchor).getBoundingClientRect();
      top = a.top - 10;
      if (box.right + 12 + w <= innerWidth - MARGIN) left = box.right + 12;
      else if (box.left - 12 - w >= MARGIN) left = box.left - 12 - w;
      else {
        left = a.left + a.width / 2 - w / 2;
        top = a.bottom + MARGIN;
        if (top + h > innerHeight - MARGIN) top = a.top - h - MARGIN;
      }
    } else {
      left = a.right - w;
      top = a.bottom + 6;
      if (top + h > innerHeight - MARGIN) top = a.top - h - 6;
    }
    setPos({ top: clamp(top, MARGIN, innerHeight - h - MARGIN), left: clamp(left, MARGIN, innerWidth - w - MARGIN) });
    ref.current.focus({ preventScroll: true });
  }, [anchor, placement]);

  // 点外面、按 Esc、滚动或改变窗口大小时关闭（锚点自己负责开关）。
  useEffect(() => {
    const inside = (t: EventTarget | null) =>
      !!t && (ref.current?.contains(t as Node) || (typeof placement === 'string' && anchor?.contains(t as Node)));
    const onPointer = (e: PointerEvent) => !inside(e.target) && onClose();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      onClose();
      anchor?.focus();
    };
    const onScroll = (e: Event) => !ref.current?.contains(e.target as Node) && onClose();
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onClose);
    };
  }, [anchor, placement, onClose]);

  return createPortal(
    <div
      ref={ref}
      role={role}
      aria-label={label}
      tabIndex={-1}
      className={`popover ${className}`}
      style={pos ?? { top: 0, left: 0, visibility: 'hidden' }}
    >
      {children}
    </div>,
    document.body,
  );
}

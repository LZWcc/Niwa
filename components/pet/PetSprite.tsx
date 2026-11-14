import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { DEFAULT_ITEMS } from '@/config';
import { useStoredList } from '@/hooks/useStored';
import { isGridItem } from '@/utils/grid/items';
import type { Pet } from '@/utils/pet/model';
import { actionKeyframes, CELL, LOOK_ROW, lookAt, readPetSprite, ROW, type PetAction } from '@/utils/pet/sprite';
import { prefersReducedMotion } from '@/utils/spring';
import { KEYS } from '@/utils/storage';
import { spentOf } from '@/utils/timer';

// 宠物（导入了才加载，见 Pet.tsx）：浮在页面上，拖到哪就停在哪，点一下打招呼。
// 平时呼吸、眨眼；计时器在走时在旁边忙，时间到了等你来看；第 2 版的宠物视线跟着指针转。
// 动画只改图片的 transform（Web Animations），由合成器播放，不占主线程；看不见的标签页浏览器自己会停。

const DRAG_START = 4; // 按下后移动超过这么多像素才算拖动，否则就是点击
const IDLE_REST = 3000; // 平常的样子播完一轮后歇 1–2 倍这么久（毫秒）再播

type Spot = { x: number; y: number };
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export default function PetSprite({ pet, onMove }: { pet: Pet; onMove: (spot: Spot) => void }) {
  const [src, setSrc] = useState<string | null>(null);
  // 拖动中的位置和往哪边走；没拖时是 null
  const [drag, setDrag] = useState<(Spot & { dir: 'left' | 'right' | null }) | null>(null);
  const [waving, setWaving] = useState(false);
  const [look, setLook] = useState<number | null>(null);
  const [items] = useStoredList(KEYS.grid, isGridItem, DEFAULT_ITEMS);
  const [, tick] = useState(0);
  const sprite = useRef<HTMLImageElement>(null);
  const waveTimer = useRef(0);

  // 图片在 IndexedDB 里：读出来交给 <img>，换宠物、移除时释放
  useEffect(() => {
    let url = '';
    let gone = false;
    void readPetSprite().then((blob) => {
      if (gone || !blob) return;
      url = URL.createObjectURL(blob);
      setSrc(url);
    });
    return () => {
      gone = true;
      URL.revokeObjectURL(url);
    };
  }, []);

  // 网格里的计时器：有到点的就等你，有在走的就忙
  const now = Date.now();
  const timers = items.flatMap((item) => (item.kind === 'widget' && item.settings?.timer?.startedAt != null ? [item.settings.timer] : []));
  const countdowns = timers.filter((t) => t.mode === 'countdown');
  const due = countdowns.some((t) => spentOf(t, now) >= t.duration);
  // 下一个倒计时到点的时刻，到时重新算一次
  const nextEnd = Math.min(...countdowns.map((t) => t.startedAt! + t.duration - t.elapsed).filter((end) => end > now));
  useEffect(() => {
    if (nextEnd === Infinity) return;
    const id = setTimeout(() => tick((n) => n + 1), nextEnd - Date.now());
    return () => clearTimeout(id);
  }, [nextEnd]);

  // 第 2 版的宠物看着指针；减少动态效果时不跟着转
  useEffect(() => {
    if (!pet.look || prefersReducedMotion()) return;
    const onMove = (e: PointerEvent) => {
      const cx = Math.min(Math.max(pet.x * innerWidth, CELL.w / 2), innerWidth - CELL.w / 2);
      const cy = Math.min(Math.max(pet.y * innerHeight, CELL.h / 2), innerHeight - CELL.h / 2);
      setLook(lookAt(e.clientX - cx, e.clientY - cy));
    };
    addEventListener('pointermove', onMove);
    return () => removeEventListener('pointermove', onMove);
  }, [pet.look, pet.x, pet.y]);

  const action: PetAction | 'look' = drag
    ? (drag.dir ?? 'idle')
    : waving
      ? 'wave'
      : due
        ? 'waiting'
        : timers.length
          ? 'busy'
          : look === null
            ? 'idle'
            : 'look';

  useEffect(() => {
    if (!src || action === 'look' || prefersReducedMotion()) return;
    const { keyframes, duration } = actionKeyframes(action);
    // 平常的样子一轮只有 1.1 秒，里面有一次眨眼，连着播就是一秒眨一次：播完一轮停在第一帧，随机歇几秒再播。其余动作一直播。
    const idle = action === 'idle';
    const animation = sprite.current!.animate(keyframes, { duration, iterations: idle ? 1 : Infinity });
    let rest = 0;
    if (idle) animation.onfinish = () => (rest = window.setTimeout(() => animation.play(), IDLE_REST * (1 + Math.random())));
    return () => {
      clearTimeout(rest);
      animation.cancel();
    };
  }, [src, action]);

  const wave = () => {
    clearTimeout(waveTimer.current);
    setWaving(true);
    waveTimer.current = window.setTimeout(() => setWaving(false), actionKeyframes('wave').duration);
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    const from = { px: e.clientX, py: e.clientY, x: pet.x, y: pet.y };
    let moved: Spot | null = null;
    let dir: 'left' | 'right' | null = null;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - from.px;
      const dy = ev.clientY - from.py;
      if (!moved && Math.hypot(dx, dy) < DRAG_START) return;
      if (ev.movementX) dir = ev.movementX > 0 ? 'right' : 'left';
      moved = { x: clamp01(from.x + dx / innerWidth), y: clamp01(from.y + dy / innerHeight) };
      setDrag({ ...moved, dir });
    };
    const up = (ev: PointerEvent) => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      removeEventListener('pointercancel', up);
      setDrag(null);
      if (ev.type !== 'pointerup') return;
      if (moved) onMove(moved);
      else wave();
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
  };

  if (!src) return null;
  const spot = drag ?? pet;
  const row = action === 'look' ? LOOK_ROW + Math.floor(look! / 8) : ROW[action];
  return (
    <div
      className={drag ? 'pet is-dragging' : 'pet'}
      data-action={action}
      role="img"
      aria-label={pet.name}
      style={{ '--x': spot.x, '--y': spot.y } as CSSProperties}
      onPointerDown={onPointerDown}
    >
      <img
        ref={sprite}
        className="pet-sprite"
        src={src}
        alt=""
        draggable={false}
        style={{ top: -row * CELL.h, transform: action === 'look' ? `translateX(${-(look! % 8) * CELL.w}px)` : undefined }}
      />
    </div>
  );
}

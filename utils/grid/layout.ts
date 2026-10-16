// 自由摆放的网格：每一格记自己左上角的列 x、行 y，可以留空。
// 拖放规则参照 react-grid-layout / gridstack 和手机桌面，只有四条，保证东西不会“乱飞”：
// 1. 拖到空位：直接放下；
// 2. 压到同尺寸的格子（且压住一半以上）：两块互换位置；
//    大的压到几个小的：这几个保持相互位置，整组搬进它腾出来的地方（也是互换）；
// 3. 搬不进去时，被压的小格子竖直往下推到它下面，下面再碰到的也依次往下推——只竖直移动，从不横向绕行；
// 4. 小的压到大的：这个位置不接受（返回 null），留在上一个有效位置。
// 这里都是纯函数。

export type Size = { w: number; h: number };
export type Rect = { x: number; y: number; w: number; h: number };
export type Layout = Map<string, Rect>;

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const overlapArea = (a: Rect, b: Rect) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const area = (r: Rect) => r.w * r.h;
/** 阅读顺序：先行后列 */
const before = (a: Rect, b: Rect) => a.y - b.y || a.x - b.x;

/** 从 (x, y) 起按阅读顺序往后找第一个放得下、且不压到 taken 的位置。 */
function scan(taken: Rect[], size: Size, cols: number, from = { x: 0, y: 0 }): Rect {
  const w = Math.min(size.w, cols);
  for (let y = from.y; ; y++) {
    for (let x = y === from.y ? from.x : 0; x + w <= cols; x++) {
      const spot = { x, y, w, h: size.h };
      if (!taken.some((t) => overlaps(t, spot))) return spot;
    }
  }
}

/**
 * 按保存的位置摆放。没有位置的（第一次打开时的默认项）按顺序放进第一个空位；
 * 窗口变窄、某一格超出列数或和别的重叠时，临时放到空位里，不改保存的位置。
 * 返回摆放结果和需要保存的新位置（只含原来没有位置的）。
 */
export function resolve(items: { id: string; size: Size; x?: number; y?: number }[], cols: number) {
  const layout: Layout = new Map();
  const placed: Rect[] = [];
  const fresh: Layout = new Map();
  const later: typeof items = [];
  for (const item of items) {
    const w = Math.min(item.size.w, cols);
    const rect = item.x === undefined || item.y === undefined ? null : { x: item.x, y: item.y, w, h: item.size.h };
    if (rect && rect.x + rect.w <= cols && !placed.some((p) => overlaps(p, rect))) {
      layout.set(item.id, rect);
      placed.push(rect);
    } else later.push(item);
  }
  for (const item of later) {
    const rect = scan(placed, item.size, cols);
    layout.set(item.id, rect);
    placed.push(rect);
    if (item.x === undefined) fresh.set(item.id, rect);
  }
  return { layout, fresh };
}

/**
 * 把 rect 处的 id 定下来，压到的格子竖直往下推到它下面；被推下去的再压到别的，也继续往下推。
 * 只改 y，从不横向移动。
 */
export function pushDown(layout: Layout, id: string, rect: Rect): Layout {
  const next: Layout = new Map(layout);
  next.set(id, rect);
  const settle = (key: string) => {
    const r = next.get(key)!;
    // 先处理靠下的：上面的被推下来时会把下面的继续往下推，同一列里的先后顺序不会颠倒。
    const hits = [...next].filter(([k, o]) => k !== key && overlaps(o, r)).sort(([, a], [, b]) => before(b, a));
    for (const [k, o] of hits) {
      next.set(k, { ...o, y: r.y + r.h });
      settle(k);
    }
  };
  settle(id);
  return next;
}

export type Move = { layout: Layout; kind: 'stay' | 'free' | 'swap' | 'shift' | 'push' };

/** 把 keys 这几格整体平移 (dx, dy)：不越界、不压到被拖的那块和其他格子才算数，否则返回 null。 */
function shiftGroup(layout: Layout, id: string, moved: Rect, keys: string[], dx: number, dy: number, cols: number): Layout | null {
  const next: Layout = new Map(layout).set(id, moved);
  const shifted = keys.map((key) => {
    const r = layout.get(key)!;
    return [key, { ...r, x: r.x + dx, y: r.y + dy }] as const;
  });
  const still = [...next].filter(([key]) => !keys.includes(key));
  for (const [, r] of shifted) {
    if (r.x < 0 || r.y < 0 || r.x + r.w > cols) return null;
    if (still.some(([, o]) => overlaps(o, r))) return null;
  }
  for (const [key, r] of shifted) next.set(key, r);
  return next;
}

/**
 * 把 id 拖到 target（左上角，已吸附到网格）。按上面四条规则返回新的摆放和用了哪一条；
 * 位置不接受时返回 null。
 */
export function moveItem(layout: Layout, id: string, target: { x: number; y: number }, cols: number): Move | null {
  const self = layout.get(id)!;
  const moved: Rect = { ...self, x: Math.max(0, Math.min(target.x, cols - self.w)), y: Math.max(0, target.y) };
  if (moved.x === self.x && moved.y === self.y) return { layout: new Map(layout), kind: 'stay' };
  const hits = [...layout].filter(([key, r]) => key !== id && overlaps(r, moved));
  if (!hits.length) return { layout: new Map(layout).set(id, moved), kind: 'free' };

  // 同尺寸、压住一半以上：互换（各自落在对方原来的位置，整整齐齐）。
  const twin = hits.find(([, r]) => r.w === self.w && r.h === self.h && overlapArea(r, moved) * 2 >= area(r));
  if (twin) {
    const [key, r] = twin;
    return { layout: new Map(layout).set(id, { ...r }).set(key, { ...self }), kind: 'swap' };
  }
  // 压到和自己一样大或更大的（还没压够一半，或尺寸不同）：先不动。
  if (hits.some(([, r]) => area(r) >= area(self))) return null;

  // 大压小：被压的几个保持相互位置，整组搬进腾出来的地方。
  // 先试整组平移到原位置（拖开了就是整块互换）；还和原位置重叠（只挪了一两格）时，
  // 被压到的那一列 / 一行绕到另一侧空出来的地方。
  const keys = hits.map(([key]) => key);
  const tries: [number, number][] = [[self.x - moved.x, self.y - moved.y]];
  if (moved.y === self.y && moved.x !== self.x) tries.push([moved.x > self.x ? -self.w : self.w, 0]);
  if (moved.x === self.x && moved.y !== self.y) tries.push([0, moved.y > self.y ? -self.h : self.h]);
  for (const [dx, dy] of tries) {
    const shifted = shiftGroup(layout, id, moved, keys, dx, dy, cols);
    if (shifted) return { layout: shifted, kind: 'shift' };
  }
  // 搬不进去：小的竖直往下让。
  return { layout: pushDown(layout, id, moved), kind: 'push' };
}

/**
 * 拖动时用：从上一次判断到的格子 from，沿直线一格一格走到 target（近似指针实际走过的路），
 * 每一格都按 moveItem 处理。
 * 互换、整组搬移会留下来（写进返回的 base），下一格在此基础上接着算——
 * 就像手指一格一格推过去：先把中间的小图标让开，再碰到后面的组件。
 * 指针一下子跳过好几格时，也不会越过中间的格子直接和远处的互换。
 * 返回新的 base 和要显示的摆放（全程都不接受时为 null）。
 */
export function stepDrag(base: Layout, id: string, from: { x: number; y: number }, target: { x: number; y: number }, cols: number) {
  let { x, y } = from;
  // 原地（比如又回到了起点）：直接按这一格算，之前没留下的自由移动、往下推就复原了。
  if (x === target.x && y === target.y) {
    const result = moveItem(base, id, target, cols);
    return { base, layout: result?.layout ?? null };
  }
  let shown: Layout | null = null;
  while (x !== target.x || y !== target.y) {
    x += Math.sign(target.x - x);
    y += Math.sign(target.y - y);
    const result = moveItem(base, id, { x, y }, cols);
    if (!result) continue;
    if (result.kind === 'swap' || result.kind === 'shift') base = result.layout;
    shown = result.layout;
  }
  return { base, layout: shown };
}

/** 新加的格子放在 after 里最后一格后面（按阅读顺序），并避开 taken 里所有格子。 */
export function appendSpot(taken: Layout, size: Size, cols: number, after: Layout = taken) {
  const last = [...after.values()].sort(before).at(-1);
  return scan([...taken.values()], size, cols, last ? { x: last.x + last.w, y: last.y } : undefined);
}

/** 从 from 起按阅读顺序找第一个放得下 size、且不压到 taken 的位置。 */
export const findSpot = (taken: Layout, size: Size, cols: number, from: { x: number; y: number }) =>
  scan([...taken.values()], size, cols, from);

/** 按阅读顺序排在最后的那一格的 key。 */
export const lastKey = (layout: Layout) => [...layout].sort(([, a], [, b]) => before(a, b)).at(-1)?.[0];

export const sameLayout = (a: Layout, b: Layout) =>
  a.size === b.size &&
  [...a].every(([key, r]) => {
    const o = b.get(key);
    return !!o && o.x === r.x && o.y === r.y && o.w === r.w && o.h === r.h;
  });

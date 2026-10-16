import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { isPoint, sizeOf, type GridItem, type Point } from '@/utils/grid/items';
import { appendSpot, findSpot, lastKey, pushDown, resolve, type Layout, type Size } from '@/utils/grid/layout';
import { KEYS, readJson, writeJson } from '@/utils/storage';
import { WIDGET_SIZES, type WidgetSize } from '@/utils/widgets';

// 网格的摆放：列数、每一格在哪（含「添加」），以及新格子放哪、改尺寸后怎么让。
// 数据（useGrid）只存 x、y，这里把它们和当前列数合成真正的摆放；规则本身在 utils/layout.ts。

export const UNIT = 80; // 一格的边长（像素），和 style 里的 grid-auto-rows 一致
const GAP = 20;
const MAX_COLS = 12;
const ADD: Size = { w: 1, h: 1 };

const colsFor = (width: number) => Math.max(1, Math.min(MAX_COLS, Math.floor((width + GAP) / (UNIT + GAP))));

type Options = {
  items: GridItem[];
  /** 把格子的位置写回数据（useGrid 的 place） */
  place: (layout: Layout) => void;
  /** 正在拖动：拖动期间列数不变，页面变高出现滚动条、网格变窄时不至于整片重排 */
  dragging: boolean;
};

export function useGridLayout(grid: RefObject<HTMLElement | null>, { items, place, dragging }: Options) {
  // 列数跟着网格宽度走。首帧先按窗口估一个，绘制前再按实际宽度校正。
  const [measured, setMeasured] = useState(() => colsFor(Math.min(innerWidth - 96, UNIT * MAX_COLS + GAP * (MAX_COLS - 1))));
  const frozen = useRef(measured);
  if (!dragging) frozen.current = measured;
  const cols = frozen.current;
  useLayoutEffect(() => {
    const g = grid.current;
    if (!g) return;
    const measure = () => setMeasured(colsFor(g.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(g);
    return () => observer.disconnect();
  }, [grid]);

  // 「添加」和别的格子一样有自己的位置；第一次打开时放在最后一格后面并存下来。
  const [addPos, setAddPos] = useState(() => readJson(KEYS.addTile, isPoint));
  useEffect(() => {
    if (addPos) writeJson(KEYS.addTile, addPos);
  }, [addPos]);

  // 按保存的位置摆放（「添加」先占住它的位置）；没有位置的默认项补上后存下来。
  const entries = items.map((i) => ({ id: i.id, size: sizeOf(i), x: i.x, y: i.y }));
  const { layout, fresh } = resolve(addPos ? [{ id: 'add', size: ADD, ...addPos }, ...entries] : entries, cols);
  if (!layout.has('add')) layout.set('add', appendSpot(layout, ADD, cols));
  const freshKey = [...fresh.keys()].join();
  useEffect(() => {
    if (fresh.size) place(fresh);
    // 只在出现新的待补位置时保存一次。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshKey]);
  useEffect(() => {
    if (!addPos) setAddPos(pick(layout.get('add')!));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addPos]);

  return {
    cols,
    layout,

    /** 采用新的摆放：格子位置写回数据，「添加」的位置单独存。 */
    apply(next: Layout) {
      place(next);
      const add = next.get('add');
      if (add) setAddPos(pick(add));
    },

    /** 新格子放哪：「添加」排在最后时占它的位置、它往后挪一格；否则接在最后一格后面，不填前面留的空。 */
    spotForNew(size: Size): Point {
      const add = layout.get('add')!;
      const others = new Map([...layout].filter(([key]) => key !== 'add'));
      if (lastKey(layout) !== 'add') return pick(appendSpot(layout, size, cols, others));
      const spot = findSpot(others, size, cols, add);
      setAddPos(pick(findSpot(new Map(others).set('new', spot), ADD, cols, { x: spot.x + spot.w, y: spot.y })));
      return pick(spot);
    },

    /** 改尺寸后的摆放：变大时压到的格子竖直往下让；右边放不下就往左挪进网格里。 */
    resized(id: string, size: WidgetSize): Layout {
      const r = layout.get(id)!;
      const { w, h } = WIDGET_SIZES[size];
      return pushDown(layout, id, { x: Math.max(0, Math.min(r.x, cols - w)), y: r.y, w: Math.min(w, cols), h });
    },
  };
}

const pick = ({ x, y }: Point): Point => ({ x, y });

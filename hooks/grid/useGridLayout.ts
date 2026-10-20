import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { sizeOf, type GridItem, type Point } from '@/utils/grid/items';
import { appendSpot, findSpot, pushDown, resolve, type Layout, type Size } from '@/utils/grid/layout';
import { WIDGET_SIZES, type WidgetSize } from '@/utils/widgets';

// 网格的摆放：列数、每一格在哪，以及新格子放哪、改尺寸后怎么让。
// 数据（useGrid）只存 x、y，这里把它们和当前列数合成真正的摆放；规则本身在 utils/layout.ts。

export const UNIT = 80; // 一格的边长（像素），和 style 里的 grid-auto-rows 一致
const GAP = 20;
const MAX_COLS = 12;
const ONE: Size = { w: 1, h: 1 };

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

  // 按保存的位置摆放；没有位置的默认项补上后存下来。
  const { layout, fresh } = resolve(
    items.map((i) => ({ id: i.id, size: sizeOf(i), x: i.x, y: i.y })),
    cols,
  );
  // 要量出列数才算得出来，所以在渲染之后存。
  const freshKey = [...fresh.keys()].join();
  useEffect(() => {
    if (fresh.size) place(fresh);
    // 只在出现新的待补位置时保存一次。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshKey]);

  return {
    cols,
    layout,

    /** 新格子放哪：接在最后一格后面，不填前面留的空。 */
    spotForNew: (size: Size): Point => pick(appendSpot(layout, size, cols)),

    /** 从 from 起按阅读顺序第一个空着的格子（文件夹里拿出来的快捷方式放这里）；taken 里是另外要避开的 */
    spotAfter(from: Point, taken: Point[] = []): Point {
      const all = new Map(layout);
      taken.forEach((p, i) => all.set(`taken-${i}`, { ...p, w: 1, h: 1 }));
      return pick(findSpot(all, { w: 1, h: 1 }, cols, from));
    },

    /** (x, y) 处的格子；放不下 size 就往后找第一个放得下的空位（从文件夹、小组件库里拖出来时先放这里） */
    spotAt(x: number, y: number, size: Size = ONE): Point {
      const g = grid.current!;
      const base = g.getBoundingClientRect();
      const pitch = UNIT + GAP;
      const left = base.left + (g.clientWidth - (cols * pitch - GAP)) / 2; // 列是居中的
      const cell = {
        x: Math.max(0, Math.min(cols - Math.min(size.w, cols), Math.floor((x - left) / pitch))),
        y: Math.max(0, Math.floor((y - base.top) / pitch)),
      };
      return pick(findSpot(layout, size, cols, cell));
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

// 布局算法（utils/layout.ts）的单元测试：pnpm test:unit
// 用字母画出网格，每个检查都写明期望的摆放。
import { moveItem, stepDrag, insertIcon, pushDown, resolve, appendSpot, findSpot } from '../../utils/grid/layout.ts';
let pass = 0,
  fail = 0;
const ok = (c, m) => {
  if (c) pass++;
  else fail++;
  console.log(`${c ? 'PASS' : 'FAIL'} ${m}`);
};
// 画出布局：每格写 id
const draw = (layout, cols, rows) => {
  const g = Array.from({ length: rows }, () => Array(cols).fill('.'));
  for (const [k, r] of layout) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (g[y]) g[y][x] = k;
  return g.map((r) => r.join(' ')).join(' / ');
};
const L = (spec) => new Map(Object.entries(spec).map(([k, [x, y, w = 1, h = 1]]) => [k, { x, y, w, h }]));
const noOverlap = (l) =>
  [...l].every(([k, a]) =>
    [...l].every(([k2, b]) => k === k2 || a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y),
  );
// 除了 except 以外，谁的 x 变了
const movedSideways = (a, b, except) => [...a].filter(([k, r]) => k !== except && b.get(k).x !== r.x).map(([k]) => k);

// 1. 拖到空位：只动自己
let l = L({ A: [0, 0], B: [1, 0] });
let n = moveItem(l, 'A', { x: 3, y: 1 }, 4).layout;
ok(draw(n, 4, 2) === '. B . . / . . . A', `free move to empty cell: ${draw(n, 4, 2)}`);
// 2. 同尺寸互换：左右、上下、隔得远
n = moveItem(l, 'A', { x: 1, y: 0 }, 4).layout;
ok(draw(n, 4, 1) === 'B A . .', `adjacent icons swap (right): ${draw(n, 4, 1)}`);
n = moveItem(l, 'B', { x: 0, y: 0 }, 4).layout;
ok(draw(n, 4, 1) === 'B A . .', `adjacent icons swap (left): ${draw(n, 4, 1)}`);
l = L({ A: [0, 0], B: [0, 1] });
n = moveItem(l, 'A', { x: 0, y: 1 }, 4).layout;
ok(draw(n, 4, 2) === 'B . . . / A . . .', `vertical swap: ${draw(n, 4, 2)}`);
l = L({ A: [0, 0], B: [1, 0], C: [2, 0], D: [3, 0] });
n = moveItem(l, 'A', { x: 3, y: 0 }, 4).layout;
ok(draw(n, 4, 1) === 'D B C A', `far swap, nobody in between moves: ${draw(n, 4, 1)}`);
// 中组件对中组件：压住一半以上才互换，互换后整整齐齐
l = L({ M: [0, 0, 4, 2], N: [4, 0, 4, 2] });
ok(moveItem(l, 'M', { x: 1, y: 0 }, 8) === null, 'medium over medium by 1/4: not yet');
n = moveItem(l, 'M', { x: 2, y: 0 }, 8).layout;
ok(draw(n, 8, 2) === 'N N N N M M M M / N N N N M M M M', `medium over medium by half: swap: ${draw(n, 8, 2)}`);
// 3. 大压小：中组件拖到右边 4 个图标上，整组互换
l = L({ M: [0, 0, 4, 2], a: [4, 0], b: [5, 0], c: [4, 1], d: [5, 1] });
n = moveItem(l, 'M', { x: 4, y: 0 }, 8).layout;
ok(draw(n, 8, 2) === 'a b . . M M M M / c d . . M M M M', `medium swaps with a block of 4 icons: ${draw(n, 8, 2)}`);
l = L({ M: [0, 0, 4, 2], a: [4, 0], b: [5, 0], c: [6, 0], d: [7, 0] });
n = moveItem(l, 'M', { x: 4, y: 0 }, 8).layout;
ok(draw(n, 8, 2) === 'a b c d M M M M / . . . . M M M M', `medium swaps with a row of 4 icons: ${draw(n, 8, 2)}`);
// 只挪一格：被压到的那一列绕到左边腾出的地方
l = L({ M: [0, 0, 4, 2], a: [4, 0], b: [5, 0], c: [4, 1] });
n = moveItem(l, 'M', { x: 1, y: 0 }, 8).layout;
ok(draw(n, 8, 2) === 'a M M M M b . . / c M M M M . . .', `medium moved one cell, icon column goes to the other side: ${draw(n, 8, 2)}`);
// 往下拖到下面一排图标上：整组搬上来
l = L({ M: [0, 0, 4, 2], a: [0, 2], b: [1, 2], c: [2, 2], d: [3, 2] });
n = moveItem(l, 'M', { x: 0, y: 2 }, 4).layout;
ok(draw(n, 4, 4) === 'a b c d / . . . . / M M M M / M M M M', `medium dragged down swaps with icons below: ${draw(n, 4, 4)}`);
// 搬不进去时才往下推（左边贴着网格边，绕不过去），而且只竖直移动
l = L({ M: [0, 0, 4, 2], x: [8, 0], a: [4, 0], c: [4, 1], d: [4, 2] });
n = moveItem(l, 'M', { x: 1, y: 0 }, 9).layout;
ok((noOverlap(n) && movedSideways(l, n, 'M').length === 0) || draw(n, 9, 3).startsWith('a'), `fallback: ${draw(n, 9, 5)}`);
l = L({ M: [0, 0, 4, 2], z: [0, 2], a: [4, 0], c: [4, 1], d: [4, 2] });
n = moveItem(l, 'M', { x: 0, y: 1 }, 5)?.layout;
ok(!n || noOverlap(n), `vertical small move stays valid: ${n ? draw(n, 5, 5) : 'rejected'}`);
// 两个中组件中间夹着一列竖着的图标：左边的往右推，先让开图标，再碰到右边的组件
{
  const l0 = L({ M: [0, 0, 4, 2], a: [4, 0], b: [4, 1], N: [5, 0, 4, 2] });
  const at = (x) => stepDrag(l0, 'M', { x: 0, y: 0 }, { x, y: 0 }, 9);
  ok(
    draw(at(1).layout, 9, 2) === 'a M M M M N N N N / b M M M M N N N N',
    `one cell: icons slide past, widgets stay: ${draw(at(1).layout, 9, 2)}`,
  );
  ok(
    draw(at(2).layout, 9, 2) === 'a M M M M N N N N / b M M M M N N N N',
    `jump two cells at once: still only icons moved: ${draw(at(2).layout, 9, 2)}`,
  );
  ok(
    draw(at(3).layout, 9, 2) === 'a N N N N M M M M / b N N N N M M M M',
    `three cells: now it swaps with the other widget: ${draw(at(3).layout, 9, 2)}`,
  );
  ok(draw(at(0).layout, 9, 2) === draw(l0, 9, 2), 'no move: unchanged');
  // 先往右（图标让开、留在 base 里），再拖回起点：图标回到原处
  const s1 = stepDrag(l0, 'M', { x: 0, y: 0 }, { x: 1, y: 0 }, 9);
  const back = stepDrag(s1.base, 'M', { x: 1, y: 0 }, { x: 0, y: 0 }, 9);
  ok(draw(back.layout, 9, 2) === draw(l0, 9, 2), `drag back restores icons: ${draw(back.layout, 9, 2)}`);
}
// 4. 小压大：不接受
l = L({ M: [0, 0, 4, 2], a: [4, 0] });
ok(moveItem(l, 'a', { x: 1, y: 0 }, 8) === null, 'icon onto widget rejected');
// 拖过一排：互换累积，每个只挪一格，像手机桌面
{
  let base = L({ A: [0, 0], B: [1, 0], C: [2, 0], D: [3, 0] });
  const seen = [];
  for (const x of [1, 2, 3]) {
    const m = moveItem(base, 'A', { x, y: 0 }, 4);
    if (m.kind === 'swap') base = m.layout;
    seen.push(draw(m.layout, 4, 1));
  }
  ok(seen.join(' | ') === 'B A C D | B C A D | B C D A', `drag across a row shifts one step each: ${seen.join(' | ')}`);
}
// 拖 1×1：插进去，中间的各顺移一格，像手机桌面
l = L({ A: [0, 0], B: [1, 0], C: [2, 0], D: [3, 0], E: [4, 0] });
n = insertIcon(l, 'A', { x: 3, y: 0 }, 5);
ok(draw(n, 5, 1) === 'B C D A E', `insert forward: in-between shift back one: ${draw(n, 5, 1)}`);
n = insertIcon(l, 'E', { x: 1, y: 0 }, 5);
ok(draw(n, 5, 1) === 'A E B C D', `insert backward: in-between shift on one: ${draw(n, 5, 1)}`);
ok(draw(insertIcon(n, 'E', { x: 4, y: 0 }, 5), 5, 1) === 'A B C D E', 'insert back restores order');
ok(draw(insertIcon(l, 'A', { x: 0, y: 0 }, 5), 5, 1) === draw(l, 5, 1), 'insert at home: unchanged');
// 中间有空位：挪到空位就停，远处的不动，也不会有谁被换到很远
l = L({ A: [0, 0], B: [1, 0], C: [3, 0], D: [4, 0] });
n = insertIcon(l, 'A', { x: 3, y: 0 }, 5);
ok(draw(n, 5, 1) === '. B C A D', `gap absorbs the shift: ${draw(n, 5, 1)}`);
n = insertIcon(l, 'D', { x: 1, y: 0 }, 5);
ok(draw(n, 5, 1) === 'A D B C .', `gap absorbs the shift (backward): ${draw(n, 5, 1)}`);
ok(draw(insertIcon(l, 'A', { x: 2, y: 0 }, 5), 5, 1) === '. B A C D', 'empty cell: just put it there');
// 跨行顺移，跳过组件盖住的格子
l = L({ A: [0, 0], B: [1, 0], C: [2, 0], D: [0, 1] });
n = insertIcon(l, 'D', { x: 0, y: 0 }, 3);
ok(draw(n, 3, 2) === 'D A B / C . .', `shift wraps to next row: ${draw(n, 3, 2)}`);
l = L({ W: [0, 0, 2, 2], a: [2, 0], b: [3, 0], c: [2, 1], d: [3, 1], e: [0, 2] });
n = insertIcon(l, 'e', { x: 2, y: 0 }, 4);
ok(draw(n, 4, 3) === 'W W e a / W W b c / d . . .', `shift skips widget cells: ${draw(n, 4, 3)}`);
ok(insertIcon(l, 'e', { x: 1, y: 1 }, 4) === null, 'icon onto widget cell rejected');
// 竖着放两个图标（自由摆放）
l = L({ a: [0, 0], b: [1, 0] });
n = moveItem(l, 'b', { x: 0, y: 1 }, 4).layout;
ok(draw(n, 4, 2) === 'a . . . / b . . .', `stack vertically: ${draw(n, 4, 2)}`);
// 越界：贴到最右
n = moveItem(L({ M: [0, 0, 4, 2] }), 'M', { x: 7, y: 0 }, 8).layout;
ok(n.get('M').x === 4, `clamped inside grid: x=${n.get('M').x}`);
// 改尺寸变大：往下推
l = L({ W: [0, 0, 2, 2], a: [2, 0], b: [2, 2] });
n = pushDown(l, 'W', { x: 0, y: 0, w: 4, h: 2 });
ok(noOverlap(n) && n.get('a').x === 2 && n.get('a').y === 2 && n.get('b').y === 3, `grow pushes down: ${draw(n, 4, 4)}`);
// resolve：没有位置的按顺序补进空位；有位置的保持；超出列数的临时挪
let r = resolve(
  [
    { id: 'w', size: { w: 4, h: 2 } },
    { id: 'a', size: { w: 1, h: 1 } },
    { id: 'b', size: { w: 1, h: 1 }, x: 7, y: 3 },
  ],
  6,
);
ok(
  r.layout.get('w').x === 0 && r.layout.get('a').x === 4 && r.fresh.size === 2,
  `resolve fills unpositioned: a@${r.layout.get('a').x},${r.layout.get('a').y}`,
);
ok(
  !r.fresh.has('b') && r.layout.get('b').x + 1 <= 6,
  `out-of-range item placed temporarily, not saved: b@${r.layout.get('b').x},${r.layout.get('b').y}`,
);
// 新格子位置
l = L({ a: [0, 0], c: [3, 0] });
const s = appendSpot(l, { w: 1, h: 1 }, 6);
ok(s.x === 4 && s.y === 0, `append after last item: ${s.x},${s.y}`);
ok(findSpot(L({ a: [0, 0], b: [1, 0] }), { w: 1, h: 1 }, 6, { x: 2, y: 0 }).x === 2, 'find spot from a cell');
console.log(`${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;

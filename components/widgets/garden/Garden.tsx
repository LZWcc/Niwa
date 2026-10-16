import type { ReactNode } from 'react';
import type { Phase, Season } from '@/utils/almanac';

// 箱庭：一只等距视角的砂盘，随累计天数慢慢长出东西，随季节换装。
// 地面坐标即 SVG 坐标，原点在砂盘中心；2:1 等距，地面上的圆画成 rx:ry = 2:1 的椭圆。

const TRAY_W = 96;
const TRAY_H = 48;
const DEPTH = 14;
const SAND_W = 84;
const SAND_H = 42;

const rhombus = (w: number, h: number, dy = 0) => `0,${dy - h} ${w},${dy} 0,${dy + h} ${-w},${dy}`;

/** 第几天出现什么。也用于提示“下一次变化”。 */
export const MILESTONES = [
  { day: 1, label: '一块石' },
  { day: 3, label: '第二块石' },
  { day: 5, label: '四季的落物' },
  { day: 7, label: '青苔' },
  { day: 14, label: '一棵树' },
  { day: 21, label: '小石' },
  { day: 30, label: '石灯笼' },
];

type Stone = { x: number; y: number; s: number; from: number; rings: number };
const stones: Stone[] = [
  { x: 24, y: 6, s: 13, from: 1, rings: 3 },
  { x: -30, y: 16, s: 8, from: 3, rings: 2 },
  { x: 44, y: 16, s: 5, from: 21, rings: 0 },
];
const TREE = { x: -16, y: -18, from: 14 };
const LANTERN = { x: -54, y: 2, from: 30 };
const MOSS_FROM = 7;
const SCATTER_FROM = 5;

const CANOPY: Record<Season, string[]> = {
  spring: ['#f3c1cd', '#e9a3b6', '#f8d9e1'],
  summer: ['#7fae6e', '#66985a', '#97c283'],
  autumn: ['#d9633d', '#c2462f', '#e79d3f'],
  winter: [],
};
const LEAF: Record<Season, string[]> = {
  spring: ['#f0b4c3', '#f6cfd9'],
  summer: ['#7fae6e'],
  autumn: ['#d9633d', '#e79d3f', '#c2462f'],
  winter: ['#ffffff'],
};

// 可复现的伪随机：同一天、同一个庭院，画出来总是一样。
function random(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ringR = (st: Stone, i: number) => st.s * 1.6 + i * 6;

function rock(x: number, y: number, s: number) {
  return `M${x - s} ${y}C${x - s} ${y - s * 1.25} ${x + s * 0.6} ${y - s * 1.35} ${x + s} ${y - s * 0.15}A${s} ${s / 2} 0 0 1 ${x - s} ${y}Z`;
}

function StoneShape({ x, y, s, snow }: { x: number; y: number; s: number; snow: boolean }) {
  return (
    <g>
      <ellipse className="niwa-shadow" cx={x + s * 0.4} cy={y + s * 0.08} rx={s * 1.15} ry={s * 0.45} />
      <path className="niwa-stone" d={rock(x, y, s)} />
      <path className="niwa-stone-light" d={rock(x - s * 0.28, y - s * 0.4, s * 0.55)} />
      {snow && (
        <path
          className="niwa-snow"
          d={`M${x - s * 0.8} ${y - s * 0.7}Q${x - s * 0.1} ${y - s * 1.45} ${x + s * 0.7} ${y - s * 0.75}Q${x} ${y - s * 0.95} ${x - s * 0.8} ${y - s * 0.7}Z`}
        />
      )}
    </g>
  );
}

function Tree({ x, y, season }: { x: number; y: number; season: Season }) {
  const colors = CANOPY[season];
  const blobs: [number, number, number][] = [
    [1, -40, 11],
    [-9, -33, 8.5],
    [11, -32, 9],
    [4, -49, 8],
    [-6, -45, 7.5],
    [13, -42, 6.5],
  ];
  return (
    <g>
      <ellipse className="niwa-shadow" cx={x + 6} cy={y + 1} rx={14} ry={5} />
      <path className="niwa-trunk" d={`M${x} ${y}C${x - 1} ${y - 12} ${x + 3} ${y - 20} ${x + 1} ${y - 32}`} strokeWidth="2.6" />
      <path
        className="niwa-trunk"
        d={`M${x + 1} ${y - 21}q8 -4 11 -12M${x + 1} ${y - 26}q-7 -3 -9 -10M${x + 1} ${y - 31}q2 -6 5 -9`}
        strokeWidth="1.4"
      />
      {colors.length > 0
        ? blobs.map(([dx, dy, r], i) => <circle key={i} cx={x + dx} cy={y + dy} r={r} fill={colors[i % colors.length]} />)
        : // 冬：只剩枝，枝头积雪。
          [
            [12, -33],
            [-8, -36],
            [6, -40],
            [1, -32],
          ].map(([dx, dy], i) => <ellipse key={i} className="niwa-snow" cx={x + dx!} cy={y + dy!} rx={2.6} ry={1.3} />)}
    </g>
  );
}

function Lantern({ x, y, lit }: { x: number; y: number; lit: boolean }) {
  return (
    <g>
      <ellipse className="niwa-shadow" cx={x + 4} cy={y + 1} rx={9} ry={3.5} />
      <rect className="niwa-lantern" x={x - 5} y={y - 3} width={10} height={3} rx={0.6} />
      <rect className="niwa-lantern" x={x - 2.2} y={y - 13} width={4.4} height={10} />
      <rect className="niwa-lantern" x={x - 6} y={y - 16} width={12} height={3} rx={0.6} />
      <rect className="niwa-lantern" x={x - 4.5} y={y - 25} width={9} height={9} />
      {lit && <circle cx={x} cy={y - 20.5} r={12} fill="url(#niwa-glow)" />}
      <rect className={lit ? 'niwa-window is-lit' : 'niwa-window'} x={x - 2} y={y - 23} width={4} height={5} />
      <path className="niwa-lantern" d={`M${x - 9.5} ${y - 25}Q${x} ${y - 33} ${x + 9.5} ${y - 25}Z`} />
      <circle className="niwa-lantern" cx={x} cy={y - 31.5} r={1.6} />
    </g>
  );
}

type Props = { days: number; seed: string; season: Season; phase: Phase };

export default function Garden({ days, seed, season, phase }: Props) {
  const rand = random(seed);
  const night = phase === 'dusk' || phase === 'night';
  const visible = stones.filter((st) => days >= st.from);
  const snow = season === 'winter' && days >= SCATTER_FROM;
  // 每天重新耙一次：单日、双日方向相反。
  const slope = days % 2 ? 0.5 : -0.5;

  // 季节落物撒在砂面上，避开石头。
  const count = days >= SCATTER_FROM ? Math.min(14, 3 + Math.floor(days / 4)) : 0;
  const scatter = Array.from({ length: count }, () => {
    for (let tries = 0; tries < 10; tries++) {
      const u = rand() * 2 - 1;
      const v = rand() * 2 - 1;
      if (Math.abs(u) + Math.abs(v) > 0.85) continue;
      const x = u * SAND_W;
      const y = v * SAND_H;
      if (visible.some((st) => ((x - st.x) / (st.s * 1.4)) ** 2 + ((y - st.y) / (st.s * 0.8)) ** 2 < 1)) continue;
      return { x, y, turn: rand() * 180, tone: rand() };
    }
    return null;
  }).filter((p) => p !== null);

  const moss =
    days >= MOSS_FROM
      ? visible.slice(0, 2).flatMap((st) =>
          Array.from({ length: 9 }, () => {
            const a = ((20 + rand() * 140) * Math.PI) / 180;
            return { x: st.x + Math.cos(a) * st.s * 1.05, y: st.y + Math.sin(a) * st.s * 0.5, r: 1 + rand() * 1.6 };
          }),
        )
      : [];

  // 按地面 y 排序绘制，前面的东西挡住后面的。
  const objects: { y: number; node: ReactNode }[] = visible.map((st) => ({
    y: st.y,
    node: <StoneShape key={`s${st.x}`} {...st} snow={snow} />,
  }));
  if (days >= TREE.from) objects.push({ y: TREE.y, node: <Tree key="tree" {...TREE} season={season} /> });
  if (days >= LANTERN.from) objects.push({ y: LANTERN.y, node: <Lantern key="lantern" {...LANTERN} lit={night} /> });
  objects.sort((a, b) => a.y - b.y);

  return (
    <svg className="niwa" viewBox="-110 -96 220 176" aria-hidden="true">
      <defs>
        <clipPath id="niwa-sand">
          <polygon points={rhombus(SAND_W, SAND_H)} />
        </clipPath>
        <mask id="niwa-rake">
          <rect x="-110" y="-96" width="220" height="176" fill="#fff" />
          {visible.map((st) => {
            const r = ringR(st, st.rings) + 3;
            return <ellipse key={st.x} cx={st.x} cy={st.y} rx={r} ry={r / 2} fill="#000" />;
          })}
        </mask>
        <radialGradient id="niwa-glow">
          <stop offset="0" stopColor="#ffd98a" stopOpacity=".7" />
          <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="niwa-ground">
          <stop offset="0" stopColor="#000" stopOpacity=".14" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 砂盘 */}
      <ellipse cx="0" cy={TRAY_H + DEPTH + 2} rx="112" ry="14" fill="url(#niwa-ground)" />
      <polygon className="niwa-tray-left" points={`${-TRAY_W},0 0,${TRAY_H} 0,${TRAY_H + DEPTH} ${-TRAY_W},${DEPTH}`} />
      <polygon className="niwa-tray-right" points={`0,${TRAY_H} ${TRAY_W},0 ${TRAY_W},${DEPTH} 0,${TRAY_H + DEPTH}`} />
      <polygon className="niwa-tray-top" points={rhombus(TRAY_W, TRAY_H)} />
      <polygon className="niwa-sand" points={rhombus(SAND_W, SAND_H)} />
      <polyline className="niwa-lip" points={`${-SAND_W},0 0,${-SAND_H} ${SAND_W},0`} />

      {/* 耙纹 */}
      <g clipPath="url(#niwa-sand)">
        <g className="niwa-rake" mask="url(#niwa-rake)">
          {Array.from({ length: 34 }, (_, i) => {
            const c = -96 + i * 6;
            return <line key={i} x1={-90} y1={-90 * slope + c} x2={90} y2={90 * slope + c} />;
          })}
        </g>
        <g className="niwa-rake">
          {visible.flatMap((st) =>
            Array.from({ length: st.rings }, (_, i) => {
              const r = ringR(st, i + 1);
              return <ellipse key={`${st.x}-${i}`} cx={st.x} cy={st.y} rx={r} ry={r / 2} />;
            }),
          )}
        </g>

        {scatter.map((p, i) => {
          const colors = LEAF[season];
          const fill = colors[Math.floor(p.tone * colors.length)];
          if (season === 'winter') return <circle key={i} className="niwa-snow" cx={p.x} cy={p.y} r={0.8 + p.tone} />;
          if (season === 'summer') {
            return night ? null : (
              <path key={i} className="niwa-grass" d={`M${p.x} ${p.y}l-1.5 -4M${p.x} ${p.y}l0.3 -5M${p.x} ${p.y}l1.8 -3.5`} />
            );
          }
          return (
            <ellipse
              key={i}
              cx={0}
              cy={0}
              rx={season === 'autumn' ? 2.4 : 1.8}
              ry={1.1}
              fill={fill}
              transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.turn.toFixed(0)})`}
            />
          );
        })}
      </g>

      {moss.map((m, i) => (
        <ellipse key={i} className="niwa-moss" cx={m.x} cy={m.y} rx={m.r * 1.6} ry={m.r * 0.7} />
      ))}

      {objects.map((o) => o.node)}

      {/* 夏夜萤火 */}
      {season === 'summer' &&
        night &&
        scatter.slice(0, 6).map((p, i) => (
          <g key={i} transform={`translate(${p.x.toFixed(1)} ${(p.y - 18 - p.tone * 30).toFixed(1)})`}>
            <circle r="6" fill="url(#niwa-glow)" />
            <circle r="1.1" fill="#fff6c4" />
          </g>
        ))}
    </svg>
  );
}

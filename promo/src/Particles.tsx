import { random, useCurrentFrame } from 'remotion';

// 前景的粒子和胶片颗粒，让画面有层次和空气感。位置都由 random(种子) 算，每帧一样、可重复。

const LEAF_COLORS = ['#d9573f', '#e3a86a', '#c8553d', '#dba73a'];

/** 白天：飘落的秋叶 */
export function Leaves({ opacity }: { opacity: number }) {
  const frame = useCurrentFrame();
  if (!opacity) return null;
  return (
    <svg width={1080} height={1440} style={{ position: 'absolute', inset: 0, opacity, pointerEvents: 'none' }}>
      {Array.from({ length: 12 }, (_, i) => {
        const speed = 1.4 + random(`leaf-v${i}`) * 1.6;
        const y = ((random(`leaf-y${i}`) * 1640 + frame * speed) % 1640) - 100;
        const x = random(`leaf-x${i}`) * 1080 + Math.sin(frame / 26 + i) * 46;
        const size = 0.9 + random(`leaf-s${i}`) * 1.4;
        const turn = frame * (random(`leaf-r${i}`) - 0.5) * 5 + i * 40;
        const flip = 0.6 + 0.4 * Math.abs(Math.cos(frame / 14 + i));
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${turn}) scale(${size} ${size * flip})`}>
            <path d="M0 -14 C9 -8 10 6 0 14 C-10 6 -9 -8 0 -14Z" fill={LEAF_COLORS[i % LEAF_COLORS.length]} opacity={0.85} />
            <path d="M0 -12 L0 12" stroke="rgb(0 0 0 / 0.18)" strokeWidth="1" />
          </g>
        );
      })}
    </svg>
  );
}

/** 夜里：萤火和星点，忽明忽暗 */
export function Fireflies({ opacity }: { opacity: number }) {
  const frame = useCurrentFrame();
  if (!opacity) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity, pointerEvents: 'none' }}>
      {Array.from({ length: 30 }, (_, i) => {
        const x = random(`ff-x${i}`) * 1080 + Math.sin(frame / 40 + i) * 30;
        const y = random(`ff-y${i}`) * 1440 + Math.cos(frame / 55 + i * 2) * 24 - frame * 0.15;
        const r = 2 + random(`ff-r${i}`) * 4;
        const glow = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(frame / 9 + i * 1.7));
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: r * 2,
              height: r * 2,
              borderRadius: r,
              background: '#f6e3a6',
              opacity: glow,
              boxShadow: `0 0 ${r * 4}px ${r * 1.5}px rgb(232 201 138 / 0.55)`,
            }}
          />
        );
      })}
    </div>
  );
}

/** 很淡的胶片颗粒，每两帧换一次 */
export function Grain() {
  const frame = useCurrentFrame();
  return (
    <svg
      width={1080}
      height={1440}
      style={{ position: 'absolute', inset: 0, opacity: 0.08, mixBlendMode: 'overlay', pointerEvents: 'none' }}
    >
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={Math.floor(frame / 2) % 16} />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  );
}

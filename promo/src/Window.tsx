import type { ReactNode } from 'react';
import { Img, staticFile } from 'remotion';

// 浏览器窗口：里面是 1440×900 的新标签页截图（promo/public/，pnpm assets 生成）。
// 整个页面缩放到窗口的宽度（默认 WIN.width，横版宽一些）。
export const WIN = { left: 40, top: 300, width: 1000, bar: 40 };
export const SCALE = WIN.width / 1440;
export const VIEW_H = 900 * SCALE;

/** 镜头：页面上的 (x, y) 放在窗口正中，放大 zoom 倍 */
export type Camera = { zoom: number; x: number; y: number };
export const FULL: Camera = { zoom: 1, x: 720, y: 450 };

/** 网格里一格（列 x、行 y、占几格）在页面上的位置：网格左上角在 (130, 295)，一格 80、间距 20 */
export const cell = (x: number, y: number, w = 1, h = 1) => ({
  left: 130 + x * 100,
  top: 295 + y * 100,
  width: w * 100 - 20,
  height: h * 100 - 20,
});

/** 从截图里裁出页面上的一块 */
export function Crop({
  src,
  box,
  radius = 0,
  style,
}: {
  src: string;
  box: ReturnType<typeof cell>;
  radius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ position: 'absolute', ...box, overflow: 'hidden', borderRadius: radius, ...style }}>
      <Img src={staticFile(src)} style={{ position: 'absolute', left: -box.left, top: -box.top, width: 1440, height: 900 }} />
    </div>
  );
}

export function Shot({ src, style }: { src: string; style?: React.CSSProperties }) {
  return <Img src={staticFile(src)} style={{ position: 'absolute', inset: 0, width: 1440, height: 900, ...style }} />;
}

export default function Window({
  camera,
  dark,
  width = WIN.width,
  children,
  style,
}: {
  camera: Camera;
  dark: number;
  width?: number;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  const viewH = (900 * width) / 1440;
  const s = (width / 1440) * camera.zoom;
  const bar = `rgb(${232 - 200 * dark} ${236 - 196 * dark} ${238 - 194 * dark})`;
  return (
    <div
      style={{
        position: 'absolute',
        left: WIN.left,
        top: WIN.top,
        width,
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 30px 80px -30px rgb(20 30 40 / 0.45), 0 0 0 1px rgb(0 0 0 / 0.06)',
        ...style,
      }}
    >
      <div style={{ height: WIN.bar, background: bar, display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px' }}>
        {['#ec6a5e', '#f4bf4f', '#61c554'].map((c) => (
          <span key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />
        ))}
      </div>
      <div style={{ position: 'relative', height: viewH, overflow: 'hidden', background: '#dde4ea' }}>
        <div
          style={{
            position: 'absolute',
            width: 1440,
            height: 900,
            transformOrigin: '0 0',
            transform: `translate(${width / 2 - camera.x * s}px, ${viewH / 2 - camera.y * s}px) scale(${s})`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

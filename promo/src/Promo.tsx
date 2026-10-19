import {
  AbsoluteFill,
  Html5Audio,
  interpolate,
  interpolateColors,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import Garden from '@/components/widgets/garden/Garden';
import '@/entrypoints/newtab/styles/tokens.css';
import '@/entrypoints/newtab/styles/widgets/garden.css';
import Logo from './Logo';
import { Fireflies, Grain, Leaves } from './Particles';
import { ACCENT, FONT, GOLD, GROW, INK, MOON, MUTED, NIGHT, PAPER, POP, T } from './theme';
import Window, { cell, Crop, FULL, Shot, type Camera } from './Window';

export const DURATION = T.end;

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const mix = (a: Camera, b: Camera, t: number): Camera => ({
  zoom: a.zoom + (b.zoom - a.zoom) * t,
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

// 浅色截图里的格子按出现顺序（和 scripts/screenshots.mjs 的浅色布局一致）：先是快捷方式，再是小组件，最后右下角。
// 每个格子弹出时配乐里响一个音（POP，music.ts），外面荡开一圈朱红的光环
const POPS: { box: ReturnType<typeof cell>; card?: boolean }[] = [
  ...[0, 1, 2, 3].map((i) => ({ box: cell(4 + i, 0) })),
  ...[0, 1, 2, 3].map((i) => ({ box: cell(4 + i, 1) })),
  { box: cell(0, 0, 4, 4), card: true },
  { box: cell(8, 0, 4, 2), card: true },
  { box: cell(4, 2, 4, 2), card: true },
  { box: cell(8, 2, 2, 2), card: true },
  { box: cell(10, 2) },
  { box: cell(11, 2) },
  { box: cell(10, 3) },
  { box: cell(11, 3) },
];

// 推近时钟：放大两倍时，左上角正好是页面的左上角
const CLOCK: Camera = { zoom: 2, x: 360, y: 225 };
// 深色截图里庭的位置（第 10、11 列，第 0、1 行）
const GARDEN: Camera = { zoom: 3.2, x: 1215, y: 385 };

const TAGLINE = '给新标签页，留一方庭院';

/**
 * 竖版（1080×1440，小红书）和横版（1920×1080，X、B 站）的摆法，时间轴、配乐都一样。
 * 横版：窗口大一些放在左边，字幕放在右边一栏；庭的箱庭在左、天数在右。
 */
const LAYOUTS = {
  tall: {
    brand: { left: 60, top: 92 },
    window: { left: 40, top: 300, width: 1000 },
    caption: { left: 0, top: 1040, width: 1080, align: 'center' as 'center' | 'left', size: 72, breakAtComma: false },
    gardenCard: { left: 120, top: 320, width: 840, height: 690 },
    gardenDays: { left: 0, top: 90, width: 1080, justify: 'center' },
  },
  wide: {
    brand: { left: 110, top: 44 },
    window: { left: 110, top: 175, width: 1180 },
    // 右边一栏窄：主句在逗号处换行（「想放哪儿，」「就放哪儿」）
    caption: { left: 1350, top: 450, width: 520, align: 'left' as 'center' | 'left', size: 64, breakAtComma: true },
    gardenCard: { left: 170, top: 170, width: 900, height: 740 },
    gardenDays: { left: 1150, top: 230, width: 700, justify: 'flex-start' },
  },
};
type Layout = (typeof LAYOUTS)['tall'];

/** 每段的字幕：一句短的（标出的词上强调色），下面一行小字说清楚是什么 */
type Part = [string, boolean?];
const CAPTIONS: { from: number; to: number; main: Part[]; sub: string }[] = [
  { from: T.open + 10, to: T.widgets, main: [['七十二候', true], ['，'], ['五日一换']], sub: '每次打开，都知道此刻的节气与物候' },
  { from: T.widgets + 10, to: T.dusk, main: [['想放哪儿，'], ['就放哪儿', true]], sub: '快捷方式和十种小组件，自由摆放' },
  { from: T.dusk + 10, to: T.garden, main: [['日落，'], ['月升', true]], sub: '深色模式是一次入夜，月亮按今晚的月相升起' },
  { from: T.garden + 10, to: T.privacy, main: [['你来的每一天，'], ['它都在长', true]], sub: '一块石，一棵树，一盏夜里会亮的灯笼' },
];

export default function Promo({ wide = false }: { wide?: boolean }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const layout = wide ? LAYOUTS.wide : LAYOUTS.tall;
  // 入夜这一段里底色从宣纸色变成夜色，之后一直是夜里；箱庭的颜色跟着 <html data-theme>（tokens.css）
  const dark = interpolate(frame, [T.dusk + 10, T.dusk + 60], [0, 1], clamp);
  document.documentElement.dataset.theme = frame >= T.garden ? 'dark' : 'light';

  return (
    <AbsoluteFill style={{ background: interpolateColors(dark, [0, 1], [PAPER, NIGHT]), fontFamily: FONT }}>
      {/* 配乐由 music.ts 合成（pnpm music） */}
      <Html5Audio src={staticFile('music.wav')} />
      {wide ? <WideIntro /> : <Intro />}
      <Sequence from={T.open - 10} durationInFrames={T.garden - T.open + 30} layout="none">
        <Page dark={dark} layout={layout} />
      </Sequence>
      <Brand dark={dark} layout={layout} />
      <Leaves opacity={interpolate(frame, [T.intro + 20, T.intro + 40, T.dusk + 10, T.dusk + 40], [0, 0.9, 0.9, 0], clamp)} />
      {CAPTIONS.map((c) => (
        <Caption key={c.sub} {...c} dark={dark} layout={layout} />
      ))}
      <Sequence from={T.garden} durationInFrames={T.privacy - T.garden} layout="none">
        <GardenScene layout={layout} />
      </Sequence>
      <Sequence from={T.privacy} durationInFrames={T.outro - T.privacy} layout="none">
        <Privacy />
      </Sequence>
      <Sequence from={T.outro} layout="none">
        <Outro fps={fps} />
      </Sequence>
      <Fireflies opacity={interpolate(frame, [T.dusk + 30, T.dusk + 70], [0, 1], clamp)} />
      <Grain />
    </AbsoluteFill>
  );
}

/** 片头：远山、近山先后从下面升起，太阳从山后升起，标题在天上浮现（字距收拢）；然后收成左上角的图标 */
function Intro() {
  const frame = useCurrentFrame() - T.intro;
  const { fps } = useVideoConfig();
  if (frame < -12 || frame >= T.open - T.intro + 10) return null;
  const hills = spring({ frame, fps, config: { damping: 24, mass: 1.2 } });
  const rise = spring({ frame: frame - 6, fps, config: { damping: 30, mass: 1.4 } });
  const end = T.open - T.intro;
  const shrink = spring({ frame: frame - (end - 22), fps, config: { damping: 22 } });
  const size = interpolate(shrink, [0, 1], [1080, 88]);
  const title = interpolate(frame, [20, 40, end - 22, end - 8], [0, 1, 1, 0], clamp);
  const sub = interpolate(frame, [34, 52, end - 22, end - 8], [0, 1, 1, 0], clamp);
  return (
    <>
      {/* 和图标的天同色（#e9e4d8），图收起来时淡成宣纸色 */}
      <AbsoluteFill style={{ background: '#e9e4d8', opacity: 1 - shrink }} />
      <div style={{ position: 'absolute', left: interpolate(shrink, [0, 1], [0, 60]), top: interpolate(shrink, [0, 1], [360, 92]) }}>
        <Logo
          size={size}
          radius={interpolate(shrink, [0, 1], [0, 28])}
          sun={interpolate(rise, [0, 1], [86, 40])}
          shadow={shrink * 6}
          lift={(1 - hills) * 40}
        />
      </div>
      <div style={{ position: 'absolute', top: 160, width: '100%', textAlign: 'center', color: INK }}>
        <div style={{ fontSize: 96, fontWeight: 300, letterSpacing: 8 + (1 - title) * 40, opacity: title }}>Niwa · 庭</div>
        <div
          style={{
            fontSize: 40,
            color: MUTED,
            marginTop: 24,
            letterSpacing: 6,
            opacity: sub,
            transform: `translateY(${(1 - sub) * 16}px)`,
          }}
        >
          {TAGLINE}
        </div>
      </div>
    </>
  );
}

/**
 * 横版的片头：山横着铺满整个画面（正方形的图标撑不满），太阳单独画、从山后升起，标题在天上浮现；
 * 结束时整幅淡出，左上角出现图标（Brand）。
 */
function WideIntro() {
  const frame = useCurrentFrame() - T.intro;
  const { fps } = useVideoConfig();
  if (frame < -12 || frame >= T.open - T.intro + 10) return null;
  const hills = spring({ frame, fps, config: { damping: 24, mass: 1.2 } });
  const rise = spring({ frame: frame - 6, fps, config: { damping: 30, mass: 1.4 } });
  const end = T.open - T.intro;
  const fade = interpolate(frame, [end - 18, end + 4], [1, 0], clamp);
  const title = interpolate(frame, [20, 40], [0, 1], clamp);
  const sub = interpolate(frame, [34, 52], [0, 1], clamp);
  const lift = (1 - hills) * 300;
  return (
    <AbsoluteFill style={{ opacity: fade, background: 'linear-gradient(#e9e4d8, #f4f1ea)' }}>
      <div
        style={{
          position: 'absolute',
          left: 1290,
          top: interpolate(rise, [0, 1], [760, 330]),
          width: 240,
          height: 240,
          borderRadius: '50%',
          background: ACCENT,
        }}
      />
      {/* 和图标同一套山（viewBox 0 0 128 128），横向拉开铺满 */}
      <svg width={1920} height={1080} viewBox="0 0 128 128" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id="wide-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8fa2ae" />
            <stop offset="1" stopColor="#8fa2ae" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="wide-near" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#26313b" />
            <stop offset="1" stopColor="#26313b" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <path
          transform={`translate(0 ${(lift * 0.6 * 128) / 1080})`}
          d="M0 84 C14 70 24 50 38 46 C50 43 56 62 66 66 C78 70 88 58 100 62 C112 66 120 76 128 80 L128 112 L0 112 Z"
          fill="url(#wide-far)"
        />
        <path
          transform={`translate(0 ${(lift * 128) / 1080})`}
          d="M0 104 C10 96 18 76 32 72 C44 69 50 88 58 94 C64 98 70 92 78 90 C92 86 108 100 128 104 L128 128 L0 128 Z"
          fill="url(#wide-near)"
        />
      </svg>
      <div style={{ position: 'absolute', top: 130, width: '100%', textAlign: 'center', color: INK }}>
        <div style={{ fontSize: 110, fontWeight: 300, letterSpacing: 10 + (1 - title) * 40, opacity: title }}>Niwa · 庭</div>
        <div
          style={{
            fontSize: 44,
            color: MUTED,
            marginTop: 24,
            letterSpacing: 8,
            opacity: sub,
            transform: `translateY(${(1 - sub) * 16}px)`,
          }}
        >
          {TAGLINE}
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** 左上角的图标和名字（片头收过来之后） */
function Brand({ dark, layout }: { dark: number; layout: Layout }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [T.open - 8, T.open + 4, T.garden - 10, T.garden + 4], [0, 1, 1, 0], clamp);
  if (!opacity) return null;
  return (
    <div style={{ position: 'absolute', ...layout.brand, display: 'flex', alignItems: 'center', gap: 26, opacity }}>
      <Logo size={88} radius={28} sun={40} shadow={6} />
      <span style={{ fontSize: 46, fontWeight: 300, letterSpacing: 4, color: interpolateColors(dark, [0, 1], [INK, MOON]) }}>
        Niwa · 庭
      </span>
    </div>
  );
}

function Caption({
  from,
  to,
  main,
  sub,
  dark,
  layout,
}: {
  from: number;
  to: number;
  main: Part[];
  sub: string;
  dark: number;
  layout: Layout;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = interpolate(frame, [from, from + 12, to - 10, to], [0, 1, 1, 0], clamp);
  const s = interpolate(frame, [from + 10, from + 24, to - 10, to], [0, 1, 1, 0], clamp);
  // 强调的词晚一点弹出来
  const hi = spring({ frame: frame - from - 6, fps, config: { damping: 9 } });
  if (!t) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: layout.caption.left,
        top: layout.caption.top,
        width: layout.caption.width,
        textAlign: layout.caption.align,
      }}
    >
      <div
        style={{
          fontSize: layout.caption.size,
          lineHeight: 1.35,
          fontWeight: 600,
          letterSpacing: 4,
          color: interpolateColors(dark, [0, 1], [INK, MOON]),
          opacity: t,
          transform: `translateY(${(1 - t) * 24}px)`,
        }}
      >
        {main.map(([text, strong]) =>
          strong ? (
            <span key={text} style={{ color: dark > 0.5 ? GOLD : ACCENT, display: 'inline-block', transform: `scale(${0.7 + 0.3 * hi})` }}>
              {text}
            </span>
          ) : (
            <span key={text}>
              {text}
              {layout.caption.breakAtComma && text.endsWith('，') && <br />}
            </span>
          ),
        )}
      </div>
      <div
        style={{
          fontSize: 32,
          marginTop: 24,
          lineHeight: 1.5,
          letterSpacing: 3,
          color: interpolateColors(dark, [0, 1], [MUTED, '#a3adb0']),
          opacity: s,
          transform: `translateY(${(1 - s) * 16}px)`,
        }}
      >
        {sub}
      </div>
    </div>
  );
}

/** 窗口里的新标签页：斜着转进来（推近时钟）→ 格子一个个出现、窗口轻轻摆动 → 落平、入夜 → 推近庭 */
function Page({ dark, layout }: { dark: number; layout: Layout }) {
  // 比 T.open 早 10 帧出现，接上片头收成图标的那一下
  const frame = useCurrentFrame() + T.open - 10;
  const { fps } = useVideoConfig();
  const appear = spring({ frame: frame - (T.open - 10), fps, config: { damping: 20, mass: 1.3 } });
  const toClock = spring({ frame: frame - (T.open + 18), fps, config: { damping: 26, mass: 1.2 } });
  const back = spring({ frame: frame - (T.widgets - 18), fps, config: { damping: 26, mass: 1.2 } });
  const toGarden = spring({ frame: frame - (T.garden - 30), fps, config: { damping: 26, mass: 1.2 } });
  const camera = mix(mix(mix(FULL, CLOCK, toClock), FULL, back), GARDEN, toGarden);
  // 格子出现那一段窗口转一个来回
  const sway = Math.sin(interpolate(frame, [T.widgets - 10, T.dusk], [0, Math.PI], clamp));
  const rx = 24 * (1 - appear) + 5 * sway;
  const ry = -20 * (1 - appear) - 9 * sway;
  // 格子都出来以后换成完整的截图（带上卡片的阴影）
  const done = POP.start + POP.count * POP.step;
  const settled = interpolate(frame, [done + 30, done + 42], [0, 1], clamp);
  const night = interpolate(frame, [T.dusk + 4, T.dusk + 56], [0, 1], clamp);
  const fadeOut = interpolate(frame, [T.garden - 4, T.garden + 14], [1, 0], clamp);
  const mask = `linear-gradient(to bottom, black ${night * 160 - 40}%, transparent ${night * 160}%)`;

  return (
    <Window
      camera={camera}
      dark={dark}
      width={layout.window.width}
      style={{
        left: layout.window.left,
        top: layout.window.top,
        opacity: Math.min(appear * 1.5, fadeOut),
        transform: `perspective(2200px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${0.86 + appear * 0.14})`,
      }}
    >
      <Shot src="light-empty.png" />
      {POPS.map(({ box, card }, i) => {
        const at = POP.start + i * POP.step;
        const p = spring({ frame: frame - at, fps, config: { damping: 12 } });
        const ring = interpolate(frame - at, [0, 16], [0, 1], clamp);
        return (
          <div key={i}>
            <Crop
              src="light.png"
              box={box}
              radius={card ? 22 : 0}
              style={{ opacity: Math.min(p, 1), transform: `scale(${0.5 + 0.5 * p})` }}
            />
            {ring > 0 && ring < 1 && (
              <div
                style={{
                  position: 'absolute',
                  left: box.left - ring * 26,
                  top: box.top - ring * 26,
                  width: box.width + ring * 52,
                  height: box.height + ring * 52,
                  borderRadius: card ? 22 + ring * 26 : '50%',
                  border: `${4 - ring * 3}px solid ${ACCENT}`,
                  opacity: 1 - ring,
                }}
              />
            )}
          </div>
        );
      })}
      <Shot src="light.png" style={{ opacity: settled }} />
      {/* 天黑从上往下压下来 */}
      <Shot src="dark.png" style={{ maskImage: mask, WebkitMaskImage: mask }} />
    </Window>
  );
}

/** 庭：天数从 1 跳到 30（大号的金色数字），石头、落物、青苔、树、石灯笼依次长出来；每长一次配乐里响一个音（GROW） */
function GardenScene({ layout }: { layout: Layout }) {
  const frame = useCurrentFrame() + T.garden;
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - T.garden, fps, config: { damping: 20 } });
  const step = Math.min(GROW.days.length - 1, Math.max(0, Math.floor((frame - GROW.start) / GROW.step)));
  const bump = spring({ frame: frame - GROW.start - step * GROW.step, fps, config: { damping: 8 } });
  const exit = interpolate(frame, [T.privacy - 12, T.privacy], [1, 0], clamp);
  // 第 30 日灯笼亮起时，箱庭后面亮起一团暖光
  const lit = interpolate(
    frame,
    [GROW.start + (GROW.days.length - 1) * GROW.step, GROW.start + (GROW.days.length - 1) * GROW.step + 20],
    [0, 1],
    clamp,
  );
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: Math.min(enter, exit) }}>
      <div
        style={{
          position: 'absolute',
          left: layout.gardenDays.left,
          top: layout.gardenDays.top,
          width: layout.gardenDays.width,
          color: MOON,
          display: 'flex',
          justifyContent: layout.gardenDays.justify,
          alignItems: 'baseline',
          gap: 18,
        }}
      >
        <span style={{ fontSize: 44, letterSpacing: 4 }}>庭 · 第</span>
        <span
          style={{
            fontSize: 168,
            fontWeight: 200,
            color: GOLD,
            lineHeight: 1,
            display: 'inline-block',
            minWidth: 190,
            transform: `scale(${1.25 - 0.25 * bump})`,
            textShadow: '0 0 40px rgb(232 201 138 / 0.45)',
          }}
        >
          {GROW.days[step]}
        </span>
        <span style={{ fontSize: 44 }}>日</span>
      </div>
      <div
        style={{
          position: 'absolute',
          ...layout.gardenCard,
          borderRadius: 48,
          background: 'radial-gradient(circle, rgb(255 255 255 / 0.08) 1.5px, transparent 1.6px) 0 0 / 22px 22px, rgb(0 0 0 / 0.16)',
          boxShadow: `inset 0 0 0 1px rgb(255 255 255 / 0.08), 0 0 ${120 * lit}px ${20 * lit}px rgb(232 201 138 / ${0.18 * lit})`,
          display: 'grid',
          placeItems: 'center',
          transform: `scale(${0.9 + 0.1 * enter})`,
        }}
      >
        <div style={{ width: 720, transform: `scale(${1 + 0.03 * (1 - bump)})` }}>
          <Garden days={GROW.days[step]!} seed="promo" season="autumn" phase="night" />
        </div>
      </div>
    </div>
  );
}

function Privacy() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const big = spring({ frame: frame - 4, fps, config: { damping: 16 } });
  const lines = ['不收集 · 不统计 · 不打扰', '你的一切，只留在你的浏览器里'];
  const exit = interpolate(frame, [T.outro - T.privacy - 10, T.outro - T.privacy], [1, 0], clamp);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 40,
        opacity: exit,
      }}
    >
      <div style={{ fontSize: 104, fontWeight: 300, color: MOON, letterSpacing: 16 + (1 - big) * 40, opacity: big, marginBottom: 30 }}>
        它很安静
      </div>
      {lines.map((line, i) => {
        const t = interpolate(frame, [18 + i * 12, 34 + i * 12], [0, 1], clamp);
        return (
          <div
            key={line}
            style={{ fontSize: 42, color: i ? '#a3adb0' : GOLD, letterSpacing: 4, opacity: t, transform: `translateY(${(1 - t) * 30}px)` }}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
}

const REPO = 'github.com/LZWcc/Niwa';

function Outro({ fps }: { fps: number }) {
  const frame = useCurrentFrame();
  const pop = spring({ frame, fps, config: { damping: 12 } });
  const text = interpolate(frame, [12, 28], [0, 1], clamp);
  const breathe = 1 + 0.06 * Math.sin(frame / 12);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: MOON,
      }}
    >
      <div style={{ position: 'relative', transform: `scale(${pop})` }}>
        {/* 图标后面一团呼吸的光 */}
        <div
          style={{
            position: 'absolute',
            left: -230,
            top: -230,
            width: 700,
            height: 700,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgb(232 201 138 / 0.35), rgb(217 87 63 / 0.12) 40%, transparent 68%)',
            transform: `scale(${breathe})`,
          }}
        />
        <Logo size={240} radius={28} sun={40} shadow={14} />
      </div>
      <div style={{ opacity: text, transform: `translateY(${(1 - text) * 20}px)`, textAlign: 'center' }}>
        <div style={{ fontSize: 96, fontWeight: 300, letterSpacing: 8, marginTop: 70 }}>Niwa · 庭</div>
        <div style={{ fontSize: 42, marginTop: 22, letterSpacing: 6, color: GOLD }}>{TAGLINE}</div>
        <div style={{ fontSize: 30, marginTop: 64, color: '#a3adb0', letterSpacing: 3 }}>Edge · Chrome 新标签页扩展　|　开源免费</div>
        {REPO && <div style={{ fontSize: 30, marginTop: 18, color: '#a3adb0' }}>{REPO}</div>}
      </div>
    </div>
  );
}

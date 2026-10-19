import type { ReactNode } from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import Garden from '@/components/widgets/garden/Garden';
import '@/entrypoints/newtab/styles/tokens.css';
import '@/entrypoints/newtab/styles/widgets/garden.css';
import Logo from './Logo';
import { ACCENT, FONT, GOLD, INK, MOON, MUTED, NIGHT, PAPER } from './theme';
import Window, { cell, FULL, Shot } from './Window';

// 小红书图文：一帧一张 3:4 的图（pnpm cards 渲染成 out/xhs/ 下的 png）。素材和宣传片一样：
// 截图（promo/public/，pnpm assets 生成）、图标、庭直接用 Garden 组件。截图里格子的位置和 scripts/screenshots.mjs 的布局一致。

type Page = { dark?: boolean; body: ReactNode };

/** 从截图里裁一块（页面坐标），放大 scale 倍，当一张卡片显示 */
function Tile({ src, box, scale, radius = 22 }: { src: string; box: ReturnType<typeof cell>; scale: number; radius?: number }) {
  return (
    <div
      style={{
        position: 'relative',
        flexShrink: 0,
        width: box.width * scale,
        height: box.height * scale,
        borderRadius: radius * scale,
        overflow: 'hidden',
        boxShadow: '0 18px 40px -22px rgb(20 30 40 / 0.5)',
      }}
    >
      <Img
        src={staticFile(src)}
        style={{ position: 'absolute', left: -box.left * scale, top: -box.top * scale, width: 1440 * scale, height: 900 * scale }}
      />
    </div>
  );
}

/** 标题：强调的词用 [ ] 括起来 */
function Title({ text, dark, size = 84, top = 150 }: { text: string; dark?: boolean; size?: number; top?: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        top,
        width: '100%',
        textAlign: 'center',
        fontSize: size,
        fontWeight: 700,
        letterSpacing: 4,
        lineHeight: 1.3,
        color: dark ? MOON : INK,
      }}
    >
      {text.split('\n').map((line) => (
        <div key={line}>
          {line.split(/(\[[^\]]+\])/).map((part) =>
            part.startsWith('[') ? (
              <span key={part} style={{ color: dark ? GOLD : ACCENT }}>
                {part.slice(1, -1)}
              </span>
            ) : (
              part
            ),
          )}
        </div>
      ))}
    </div>
  );
}

function Sub({ children, dark, top }: { children: ReactNode; dark?: boolean; top: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        top,
        width: '100%',
        textAlign: 'center',
        fontSize: 36,
        letterSpacing: 3,
        color: dark ? '#a3adb0' : MUTED,
      }}
    >
      {children}
    </div>
  );
}

function Bullets({ items, dark, top }: { items: string[]; dark?: boolean; top: number }) {
  return (
    <div style={{ position: 'absolute', top, left: 110, right: 110, display: 'flex', flexDirection: 'column', gap: 26 }}>
      {items.map((item) => (
        <div key={item} style={{ display: 'flex', gap: 22, fontSize: 38, lineHeight: 1.45, color: dark ? MOON : INK }}>
          <span style={{ color: dark ? GOLD : ACCENT, flexShrink: 0 }}>●</span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

const LIGHT_SHOT = 'light.png';
const DARK_SHOT = 'dark.png';

const PAGES: Page[] = [
  // 1 封面
  {
    body: (
      <>
        <Title text={'把新标签页\n变成一方[庭院]'} size={104} top={130} />
        <Sub top={440}>Edge / Chrome 扩展 · 免费开源</Sub>
        <Window camera={FULL} dark={0} style={{ top: 560 }}>
          <Shot src={LIGHT_SHOT} />
        </Window>
        <Sub top={1250}>二十四节气 · 日落月升 · 10 种小组件</Sub>
      </>
    ),
  },
  // 2 为什么自己写了一个：作者自己用别的新标签页时的痛点，和 Niwa 怎么做
  {
    body: (
      <>
        <Title text={'为什么我自己\n写了一个[新标签页]'} size={76} top={110} />
        <div style={{ position: 'absolute', top: 360, left: 90, right: 90, display: 'flex', flexDirection: 'column', gap: 30 }}>
          {(
            [
              ['之前用的扩展经常更新，一更新就被浏览器停用', '安装时只要最少的权限，其余用到时才问'],
              ['想在新标签页看课程表', '日程能直接导入 .ics 文件，也能订阅 Google 日历'],
              ['想用自己觉得更准的天气接口', '天气填自己的和风天气 KEY'],
              ['Mac 没有自带剪贴板记录', '在页面任意处粘贴，便签就存一条，点一下再复制'],
              ['想追喜欢的博客，顺便看看热榜', 'RSS 订阅和热榜都是小组件'],
              ['浏览器自带的收藏夹、历史不太好看', '做成了能翻、能搜的小组件'],
            ] as const
          ).map(([pain, fix]) => (
            <div key={pain}>
              <div style={{ fontSize: 32, color: MUTED }}>{pain}</div>
              <div style={{ fontSize: 38, color: INK, marginTop: 6, display: 'flex', gap: 14 }}>
                <span style={{ color: ACCENT }}>→</span>
                {fix}
              </div>
            </div>
          ))}
        </div>
      </>
    ),
  },
  // 3 节气
  {
    body: (
      <>
        <Title text={'[七十二候]\n五日一换'} />
        <div style={{ position: 'absolute', top: 470, left: 75 }}>
          <Tile src={LIGHT_SHOT} box={{ left: 30, top: 26, width: 430, height: 98 }} scale={2.15} radius={14} />
        </div>
        <Bullets
          top={760}
          items={[
            '时间旁边写着今天的节气和候',
            '下面一行是元代《月令七十二候集解》里这一候的解释',
            '比如寒露第二候「菊有黄华」：草木皆华于阳，独菊华于阴',
          ]}
        />
      </>
    ),
  },
  // 3 日落月升：一个窗口沿对角线切开
  {
    body: (
      <>
        <Title text={'白天是山水\n夜里是[夜庭]'} />
        <Window camera={FULL} dark={0} style={{ top: 460 }}>
          <Shot src={LIGHT_SHOT} />
          <Shot src={DARK_SHOT} style={{ clipPath: 'polygon(62% 0, 100% 0, 100% 100%, 38% 100%)' }} />
        </Window>
        <Bullets top={1160} items={['跟随系统自动切换，日落月升地过渡', '月亮按当天真实的月相画']} />
      </>
    ),
  },
  // 4 小组件合集：浅色、深色截图里裁出来拼在一起
  {
    body: (
      <>
        <Title text={'[10 种]小组件\n想放几个放几个'} size={76} top={110} />
        <div style={{ position: 'absolute', top: 340, left: 48, right: 48, display: 'flex', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Tile src={LIGHT_SHOT} box={cell(0, 0, 4, 4)} scale={1.263} />
            <Tile src={DARK_SHOT} box={cell(0, 0, 4, 2)} scale={1.263} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Tile src={LIGHT_SHOT} box={cell(8, 0, 4, 2)} scale={1.263} />
            <Tile src={LIGHT_SHOT} box={cell(4, 2, 4, 2)} scale={1.263} />
            <Tile src={DARK_SHOT} box={cell(0, 2, 4, 2)} scale={1.263} />
          </div>
        </div>
        <Sub top={1130}>还有庭、热榜、RSS 订阅、收藏夹、历史</Sub>
      </>
    ),
  },
  // 5 庭：四个阶段，夜里（第 30 日石灯笼亮着）
  {
    dark: true,
    body: (
      <>
        <Title text={'你来的每一天\n它都在[长]'} dark />
        <div style={{ position: 'absolute', top: 430, left: 85, display: 'grid', gridTemplateColumns: '440px 440px', gap: 30 }}>
          {(
            [
              [1, '一块石'],
              [7, '青苔'],
              [14, '一棵树'],
              [30, '石灯笼亮了'],
            ] as const
          ).map(([days, label]) => (
            <div
              key={days}
              style={{
                height: 380,
                borderRadius: 36,
                background: 'radial-gradient(circle, rgb(255 255 255 / 0.08) 1.5px, transparent 1.6px) 0 0 / 20px 20px, rgb(0 0 0 / 0.18)',
                boxShadow: 'inset 0 0 0 1px rgb(255 255 255 / 0.08)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '26px 20px 0',
              }}
            >
              <div style={{ fontSize: 32, color: MOON }}>
                第 <span style={{ color: GOLD, fontSize: 44 }}>{days}</span> 日 · {label}
              </div>
              <div style={{ width: 340, marginTop: 4 }}>
                <Garden days={days} seed="promo" season="autumn" phase="night" />
              </div>
            </div>
          ))}
        </div>
        <Sub dark top={1245}>
          累计打开的天数越多，长出的东西越多；断了也不惩罚
        </Sub>
      </>
    ),
  },
  // 6 自由摆放：推近快捷方式和文件夹
  {
    body: (
      <>
        <Title text={'想放哪儿\n就放[哪儿]'} />
        <Window camera={{ zoom: 2.3, x: 720, y: 385 }} dark={0} style={{ top: 450 }}>
          <Shot src={LIGHT_SHOT} />
        </Window>
        <Bullets top={1150} items={['拖动参照手机桌面，停稳了才让位', '拖到另一个图标上，收进文件夹']} />
      </>
    ),
  },
  // 7 隐私
  {
    dark: true,
    body: (
      <>
        <Title text={'它很[安静]'} dark size={110} top={300} />
        <Bullets
          dark
          top={580}
          items={[
            '没有服务器，不用注册账号',
            '不收集、不统计、没有广告',
            '布局和便签只存在你的浏览器里，可以导出备份',
            '开源（MIT），每一行代码都能看',
          ]}
        />
      </>
    ),
  },
  // 8 怎么安装
  {
    body: (
      <>
        <div style={{ position: 'absolute', top: 150, width: '100%', display: 'flex', justifyContent: 'center' }}>
          <Logo size={200} radius={28} sun={40} shadow={12} />
        </div>
        <Title text={'怎么[装]？'} top={400} />
        <Bullets
          top={590}
          items={[
            'GitHub 搜索 LZWcc/Niwa，在 Releases 下载 zip 并解压',
            '打开 edge://extensions（Chrome 是 chrome://extensions），打开「开发人员模式」',
            '点「加载解压缩的扩展」，选解压出来的文件夹',
            '扩展商店版本准备中，上架后一键安装',
          ]}
        />
      </>
    ),
  },
];

export const PAGE_COUNT = PAGES.length;

export default function Cards() {
  const index = useCurrentFrame();
  const page = PAGES[index]!;
  // 庭的颜色跟着 <html data-theme>（tokens.css）
  document.documentElement.dataset.theme = page.dark ? 'dark' : 'light';
  return (
    <AbsoluteFill style={{ background: page.dark ? NIGHT : PAPER, fontFamily: FONT }}>
      {page.body}
      {/* 底部：图标、名字、页码 */}
      <div
        style={{
          position: 'absolute',
          left: 60,
          right: 60,
          bottom: 48,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          color: page.dark ? '#a3adb0' : MUTED,
        }}
      >
        <Logo size={52} radius={28} sun={40} />
        <span style={{ fontSize: 30, letterSpacing: 3 }}>Niwa · 庭</span>
        <span style={{ marginLeft: 'auto', fontSize: 26 }}>
          {index + 1} / {PAGES.length}
        </span>
      </div>
    </AbsoluteFill>
  );
}

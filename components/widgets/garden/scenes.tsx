import type { ReactNode } from 'react';
import type { Season } from '@/utils/almanac';
import type { Pentad } from '@/utils/pentads';

// 七十二候的小景：每一候在庭里添一点这五天的物候（雁、燕、花、雷雨、霜、萤……），庭长成之后也一直有变化。
// 和水有关的几候画在水钵里（水钵第 45 日才有，没有时这几候不画）。caption 是这一候的白话，显示在庭下面的提示里。
// 坐标和 Garden.tsx 一样：原点在砂盘中心，2:1 等距；砂盘上方是天空。

type BirdKind = 'oriole' | 'dove' | 'hoopoe' | 'shrike' | 'blackbird' | 'sparrows' | 'magpie' | 'pheasant' | 'quail' | 'hen' | 'huddled';
type BugKind = 'cicada' | 'cricket' | 'mantis' | 'worm' | 'knot' | 'beetle' | 'burrow' | 'frog';
/** 水钵里的样子 */
export type Pool = 'ice' | 'thick' | 'thaw' | 'fishIce' | 'fish' | 'ripple' | 'low' | 'duckweed' | 'clam';

type Scene =
  | {
      kind:
        | 'geese'
        | 'swallows'
        | 'hawk'
        | 'rainbow'
        | 'rain'
        | 'mist'
        | 'snowfall'
        | 'dew'
        | 'frost'
        | 'fireflies'
        | 'grain'
        | 'antler'
        | 'leaves'
        | 'wind';
    }
  | { kind: 'clouds'; bolt?: boolean }
  | { kind: 'petals' | 'flowers' | 'sprouts'; color: string }
  | { kind: 'bird'; bird: BirdKind }
  | { kind: 'bug'; bug: BugKind }
  | { kind: 'pool'; pool: Pool };

export type PentadScene = Scene & { caption: string };

const PEACH = '#efa3b5';
const PAULOWNIA = '#b7a3d6';
const YELLOW = '#e2b23c';
const GREEN = '#86ab62';
const STRAW = '#b49a6c';

export const PENTAD_SCENES: Record<Pentad, PentadScene> = {
  // 立春
  东风解冻: { kind: 'pool', pool: 'thaw', caption: '东风吹来，冰开始化' },
  蛰虫始振: { kind: 'bug', bug: 'beetle', caption: '冬眠的虫子开始动了' },
  鱼陟负冰: { kind: 'pool', pool: 'fishIce', caption: '鱼游到冰面下，像背着碎冰' },
  // 雨水
  獭祭鱼: { kind: 'pool', pool: 'fish', caption: '鱼多起来，水獭开始捕鱼' },
  候雁北: { kind: 'geese', caption: '大雁往北飞回去' },
  草木萌动: { kind: 'sprouts', color: GREEN, caption: '草木冒出嫩芽' },
  // 惊蛰
  桃始华: { kind: 'petals', color: PEACH, caption: '桃花开了' },
  仓庚鸣: { kind: 'bird', bird: 'oriole', caption: '黄鹂开始鸣叫' },
  鹰化为鸠: { kind: 'bird', bird: 'dove', caption: '鹰隐去，斑鸠多了起来' },
  // 春分
  玄鸟至: { kind: 'swallows', caption: '燕子飞回来了' },
  雷乃发声: { kind: 'clouds', caption: '开始打雷' },
  始电: { kind: 'clouds', bolt: true, caption: '开始有闪电' },
  // 清明
  桐始华: { kind: 'petals', color: PAULOWNIA, caption: '泡桐开花' },
  田鼠化为鴽: { kind: 'bird', bird: 'quail', caption: '田鼠躲起来，鹌鹑出来了' },
  虹始见: { kind: 'rainbow', caption: '雨后开始见到彩虹' },
  // 谷雨
  萍始生: { kind: 'pool', pool: 'duckweed', caption: '水面长出浮萍' },
  鸣鸠拂其羽: { kind: 'bird', bird: 'dove', caption: '斑鸠梳理羽毛，叫着催耕' },
  戴胜降于桑: { kind: 'bird', bird: 'hoopoe', caption: '戴胜鸟落在桑树上' },
  // 立夏
  蝼蝈鸣: { kind: 'bug', bug: 'frog', caption: '蛙开始叫了' },
  蚯蚓出: { kind: 'bug', bug: 'worm', caption: '蚯蚓钻出地面' },
  王瓜生: { kind: 'sprouts', color: GREEN, caption: '王瓜的藤蔓长起来' },
  // 小满
  苦菜秀: { kind: 'flowers', color: YELLOW, caption: '苦菜开出小黄花' },
  靡草死: { kind: 'sprouts', color: STRAW, caption: '喜阴的细草在烈日下枯了' },
  麦秋至: { kind: 'grain', caption: '麦子熟了' },
  // 芒种
  螳螂生: { kind: 'bug', bug: 'mantis', caption: '小螳螂孵出来了' },
  鵙始鸣: { kind: 'bird', bird: 'shrike', caption: '伯劳开始鸣叫' },
  反舌无声: { kind: 'bird', bird: 'blackbird', caption: '会学舌的乌鸫不叫了' },
  // 夏至
  鹿角解: { kind: 'antler', caption: '鹿角脱落' },
  蜩始鸣: { kind: 'bug', bug: 'cicada', caption: '蝉开始叫了' },
  半夏生: { kind: 'sprouts', color: GREEN, caption: '半夏在田里长出来' },
  // 小暑
  温风至: { kind: 'wind', caption: '吹来的风都是热的' },
  蟋蟀居宇: { kind: 'bug', bug: 'cricket', caption: '蟋蟀躲到墙角避暑' },
  鹰始挚: { kind: 'hawk', caption: '小鹰开始学着搏击' },
  // 大暑
  腐草为萤: { kind: 'fireflies', caption: '萤火虫出来了' },
  土润溽暑: { kind: 'mist', caption: '土地潮湿，天气闷热' },
  大雨时行: { kind: 'rain', caption: '时常下大雨' },
  // 立秋
  凉风至: { kind: 'wind', caption: '风开始凉了' },
  白露降: { kind: 'dew', caption: '早晚有了露水' },
  寒蝉鸣: { kind: 'bug', bug: 'cicada', caption: '寒蝉开始叫' },
  // 处暑
  鹰乃祭鸟: { kind: 'hawk', caption: '鹰开始捕鸟' },
  天地始肃: { kind: 'mist', caption: '天地间开始萧瑟' },
  禾乃登: { kind: 'grain', caption: '稻谷成熟了' },
  // 白露
  鸿雁来: { kind: 'geese', caption: '大雁从北方飞来' },
  玄鸟归: { kind: 'swallows', caption: '燕子往南飞走' },
  群鸟养羞: { kind: 'bird', bird: 'sparrows', caption: '鸟儿们储食过冬' },
  // 秋分
  雷始收声: { kind: 'clouds', caption: '雷声渐渐没有了' },
  蛰虫坯户: { kind: 'bug', bug: 'burrow', caption: '虫子开始封洞准备冬眠' },
  水始涸: { kind: 'pool', pool: 'low', caption: '水开始变浅' },
  // 寒露
  鸿雁来宾: { kind: 'geese', caption: '最后一批大雁飞来' },
  雀入大水为蛤: { kind: 'pool', pool: 'clam', caption: '雀鸟少了，水边多了蛤蜊' },
  菊有黄华: { kind: 'flowers', color: YELLOW, caption: '菊花开了' },
  // 霜降
  豺乃祭兽: { kind: 'frost', caption: '开始下霜' },
  草木黄落: { kind: 'leaves', caption: '草木枯黄，叶子落了' },
  蛰虫咸俯: { kind: 'frost', caption: '虫子都躲进洞里不动了' },
  // 立冬
  水始冰: { kind: 'pool', pool: 'ice', caption: '水面开始结冰' },
  地始冻: { kind: 'frost', caption: '地面开始冻结' },
  雉入大水为蜃: { kind: 'pool', pool: 'clam', caption: '野鸡少了，水边多了大蛤' },
  // 小雪
  虹藏不见: { kind: 'clouds', caption: '彩虹看不见了' },
  天气上升: { kind: 'mist', caption: '天气上升，地气下降' },
  闭塞而成冬: { kind: 'snowfall', caption: '天地闭塞，进入寒冬' },
  // 大雪
  鹖鴠不鸣: { kind: 'bird', bird: 'huddled', caption: '寒号鸟也不叫了' },
  虎始交: { kind: 'snowfall', caption: '大雪纷飞' },
  荔挺出: { kind: 'sprouts', color: GREEN, caption: '马兰草挺出新芽' },
  // 冬至
  蚯蚓结: { kind: 'bug', bug: 'knot', caption: '蚯蚓在土里蜷成一团' },
  麋角解: { kind: 'antler', caption: '麋鹿的角脱落' },
  水泉动: { kind: 'pool', pool: 'ripple', caption: '山泉开始流动' },
  // 小寒
  雁北乡: { kind: 'geese', caption: '大雁准备往北飞' },
  鹊始巢: { kind: 'bird', bird: 'magpie', caption: '喜鹊开始筑巢' },
  雉始雊: { kind: 'bird', bird: 'pheasant', caption: '野鸡开始求偶鸣叫' },
  // 大寒
  鸡始乳: { kind: 'bird', bird: 'hen', caption: '母鸡开始孵小鸡' },
  征鸟厉疾: { kind: 'hawk', caption: '鹰隼飞得又高又急' },
  水泽腹坚: { kind: 'pool', pool: 'thick', caption: '湖面冻得又厚又硬' },
};

type Point = { x: number; y: number };
export type SceneContext = {
  rand: () => number;
  night: boolean;
  season: Season;
  /** 第一块石（第 1 日就有）、树、石灯笼的位置；还没长出来时是 null */
  stone: Point & { s: number };
  tree: Point | null;
  lantern: Point | null;
  /** 砂面上避开东西的 n 个位置 */
  free: (n: number) => Point[];
};
export type Layers = {
  /** 画在砂盘后面的天空里 */
  sky?: ReactNode;
  /** 画在砂面上（被砂面裁剪） */
  ground?: ReactNode;
  /** 和石头、树一起按前后排序 */
  objects?: { y: number; node: ReactNode }[];
  /** 画在最前面 */
  front?: ReactNode;
  /** 石头顶上结霜 */
  frost?: boolean;
};

const f1 = (n: number) => n.toFixed(1);
/** 以 p 为中心放大 k 倍：小景画得小一些好写坐标，再整体放大到小尺寸的庭里也看得清 */
const zoom = (p: Point, k: number) => `translate(${f1(p.x)} ${f1(p.y)}) scale(${k}) translate(${f1(-p.x)} ${f1(-p.y)})`;
const SEASON_LEAF: Record<Season, string> = { spring: '#f0b4c3', summer: '#97c283', autumn: '#e79d3f', winter: '#ffffff' };

/** 天上飞的鸟：一个张开翅膀的「人」字 */
const flyer = (x: number, y: number, w: number, lift: number) =>
  `M${f1(x - w)} ${f1(y)}Q${f1(x - w / 2)} ${f1(y - lift)} ${f1(x)} ${f1(y)}Q${f1(x + w / 2)} ${f1(y - lift)} ${f1(x + w)} ${f1(y)}`;

function Geese() {
  // 人字形雁阵，头雁在左
  return (
    <g className="niwa-bird">
      {Array.from({ length: 7 }, (_, i) => {
        const arm = i === 0 ? 0 : (i % 2 ? 1 : -1) * Math.ceil(i / 2);
        return <path key={i} d={flyer(30 + Math.abs(arm) * 9.5, -80 + arm * 4.4, 4, 2.6)} />;
      })}
    </g>
  );
}

function Swallows() {
  return (
    <g className="niwa-bird is-solid">
      {[
        [56, -72, 1.5],
        [82, -84, 1.2],
      ].map(([x, y, k], i) => (
        <path
          key={i}
          d={`${flyer(x!, y!, 4.6 * k!, 2.6 * k!)}M${x} ${y}l${f1(-1.4 * k!)} ${f1(3.2 * k!)}M${x} ${y}l${f1(1.4 * k!)} ${f1(3.2 * k!)}`}
        />
      ))}
    </g>
  );
}

function Hawk() {
  return (
    <g className="niwa-bird is-solid">
      <path d={`${flyer(66, -82, 10, 4.5)}M66 -82l-1 2.6h2Z`} strokeWidth="1.4" />
      <path d={flyer(90, -70, 4, 1.8)} />
    </g>
  );
}

function Rainbow() {
  const colors = ['#e88a7c', '#eec26b', '#a3c98c', '#8db2d8'];
  return (
    <g fill="none" opacity="0.45">
      {colors.map((c, i) => {
        const r = 74 - i * 3.6;
        return <path key={c} d={`M${f1(14 - r)} -6A${f1(r)} ${f1(r)} 0 0 1 ${f1(14 + r)} -6`} stroke={c} strokeWidth="3.6" />;
      })}
    </g>
  );
}

function Cloud({ x, y, k = 1 }: { x: number; y: number; k?: number }) {
  return (
    <g className="niwa-cloud" transform={`translate(${x} ${y}) scale(${k})`}>
      <circle cx="0" cy="0" r="6.5" />
      <circle cx="7" cy="-3.5" r="8" />
      <circle cx="15" cy="0" r="6.5" />
      <rect x="0" y="-2" width="15" height="8.5" rx="4" />
    </g>
  );
}

function Clouds({ bolt }: { bolt?: boolean }) {
  return (
    <g>
      <Cloud x={52} y={-76} />
      <Cloud x={-82} y={-84} k={0.6} />
      {bolt && <path className="niwa-bolt" d="M62 -68l-4.5 9h4l-3.5 9.5 9-12h-4.2l3.2-6.5Z" />}
    </g>
  );
}

/** 地面上避开东西的点，每个点画一样小东西 */
const each = (points: Point[], draw: (p: Point, i: number) => ReactNode) => points.map((p, i) => <g key={i}>{draw(p, i)}</g>);

/** 在空中散开的小片：落叶、花瓣、雪、雨 */
const airborne = (rand: () => number, n: number, box: [number, number, number, number]) =>
  Array.from({ length: n }, () => ({
    x: box[0] + rand() * (box[2] - box[0]),
    y: box[1] + rand() * (box[3] - box[1]),
    turn: rand() * 180,
    tone: rand(),
  }));

function Petal({ x, y, turn, color }: Point & { turn: number; color: string }) {
  return <ellipse cx={0} cy={0} rx={2.5} ry={1.4} fill={color} transform={`translate(${f1(x)} ${f1(y)}) rotate(${turn.toFixed(0)})`} />;
}

function Flower({ x, y, color }: Point & { color: string }) {
  return (
    <g transform={`translate(${f1(x)} ${f1(y)}) scale(1.6) translate(${f1(-x)} ${f1(-y)})`}>
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return <circle key={i} cx={f1(x + Math.cos(a) * 1.3)} cy={f1(y - 1.2 + Math.sin(a) * 0.75)} r="0.95" fill={color} />;
      })}
      <circle cx={f1(x)} cy={f1(y - 1.2)} r="0.55" fill="#a8742a" />
    </g>
  );
}

const tuft = (x: number, y: number) => `M${f1(x)} ${f1(y)}l-2.2 -6M${f1(x)} ${f1(y)}l0.4 -7.5M${f1(x)} ${f1(y)}l2.6 -5.2`;

/** 地上或枝头的小鸟（朝左） */
function Perched({
  x,
  y,
  body,
  head,
  wing,
  k = 1,
  tail = 1,
  crest,
  bill = '#4b4038',
  puffed,
}: Point & {
  body: string;
  head: string;
  wing: string;
  k?: number;
  tail?: number;
  crest?: string;
  bill?: string;
  puffed?: boolean;
}) {
  const ry = puffed ? 2.6 : 2;
  return (
    <g transform={`translate(${f1(x)} ${f1(y)}) scale(${k * 1.8})`}>
      <ellipse cx="1.2" cy="0.3" rx="3.4" ry="0.9" className="niwa-shadow" />
      <path d={`M2.4 -2.6L${f1(2.4 + 3.4 * tail)} ${f1(-3.6 - 0.6 * tail)}L${f1(2.2 + 3 * tail)} -1.4Z`} fill={wing} />
      <ellipse cx="0.6" cy={f1(-ry)} rx="3" ry={ry} fill={body} />
      <ellipse cx="1.2" cy={f1(-ry - 0.2)} rx="1.8" ry="1" fill={wing} />
      {crest && <path d="M-2.8 -4.6l-1.2 -2.6 1.8 1.2 0.4 -2.2 0.9 2.4Z" fill={crest} />}
      <circle cx="-2.3" cy={f1(-ry * 2 + 0.4)} r="1.5" fill={head} />
      {!puffed && <path d={`M-3.7 ${f1(-ry * 2 + 0.2)}l-1.4 0.4 1.4 0.4Z`} fill={bill} />}
      <circle cx="-2.7" cy={f1(-ry * 2 + 0.1)} r="0.3" fill="#1d2023" />
    </g>
  );
}

const BIRDS: Record<Exclude<BirdKind, 'sparrows' | 'hen' | 'quail' | 'magpie'>, Omit<Parameters<typeof Perched>[0], 'x' | 'y'>> = {
  oriole: { body: '#e6b53c', head: '#e6b53c', wing: '#33373b', bill: '#d9823a' },
  dove: { body: '#a7afb6', head: '#959ea6', wing: '#848d95' },
  hoopoe: { body: '#d49a5c', head: '#d49a5c', wing: '#3d3a36', crest: '#d49a5c', bill: '#2d2a27' },
  shrike: { body: '#c4a184', head: '#8f9296', wing: '#5a4a3e' },
  blackbird: { body: '#383d42', head: '#383d42', wing: '#2a2e32', bill: '#e2aa3a' },
  pheasant: { body: '#b8683c', head: '#3d6b5c', wing: '#8a4b2c', tail: 2.4, k: 1.1 },
  huddled: { body: '#959ca2', head: '#868d93', wing: '#7b8288', puffed: true },
};

function birdLayers(bird: BirdKind, ctx: SceneContext): Layers {
  const { stone, lantern, tree, free } = ctx;
  // 站在第一块石头顶上；有石灯笼时站在灯笼顶上
  const onStone = { x: stone.x - stone.s * 0.15, y: stone.y - stone.s * 1.18 };
  const perch = lantern ? { x: lantern.x, y: lantern.y - 32.6 } : onStone;
  if (bird === 'sparrows') {
    return {
      objects: free(3).map((p, i) => ({ y: p.y, node: <Perched key={i} {...p} body="#ad8a66" head="#7c5b41" wing="#8a6a4d" k={0.85} /> })),
    };
  }
  if (bird === 'quail') {
    return {
      objects: free(1).map((p) => ({
        y: p.y,
        node: <Perched key="q" {...p} body="#b0946f" head="#9a7e5c" wing="#7d6447" tail={0.4} puffed />,
      })),
    };
  }
  if (bird === 'hen') {
    const [hen, c1, c2] = free(3) as [Point, Point, Point];
    return {
      objects: [
        {
          y: hen.y,
          node: <Perched key="hen" {...hen} body="#d8b68e" head="#d8b68e" wing="#bf9a70" k={1.3} crest="#d2584a" bill="#e2aa3a" />,
        },
        ...[c1, c2].map((p, i) => ({
          y: p.y,
          node: <Perched key={i} {...p} body="#f1d66d" head="#f1d66d" wing="#e3c457" k={0.55} tail={0.3} bill="#e2aa3a" />,
        })),
      ],
    };
  }
  if (bird === 'magpie') {
    // 喜鹊落在灯笼（或石头）上，树上有个巢
    return {
      front: (
        <g>
          {tree && (
            <g>
              <ellipse cx={tree.x + 3} cy={tree.y - 37} rx="6.4" ry="3.6" fill="#7b5c46" />
              <path
                d={`M${tree.x - 3} ${tree.y - 37.8}l12 -1.4M${tree.x - 2.4} ${tree.y - 35.6}l11 1.8`}
                stroke="#5e4535"
                strokeWidth="0.7"
              />
            </g>
          )}
          <Perched {...perch} body="#2f3438" head="#2f3438" wing="#e9ecef" tail={2} />
        </g>
      ),
    };
  }
  return { front: <Perched {...perch} {...BIRDS[bird]} /> };
}

/** 鸣叫的小弧线 */
const sound = (x: number, y: number) => (
  <path className="niwa-sound" d={`M${f1(x)} ${f1(y - 1.6)}q1.2 1.6 0 3.2M${f1(x + 1.8)} ${f1(y - 2.6)}q1.9 2.6 0 5.2`} />
);

function bugLayers(bug: BugKind, ctx: SceneContext): Layers {
  const [p] = ctx.free(1) as [Point];
  const { tree, stone } = ctx;
  if (bug === 'cicada') {
    // 趴在树干上；还没长树时趴在石头侧面
    const at = tree ? { x: tree.x + 0.6, y: tree.y - 15 } : { x: stone.x + stone.s * 0.55, y: stone.y - stone.s * 0.55 };
    return {
      front: (
        <g transform={zoom(at, 1.8)}>
          <ellipse cx={at.x} cy={at.y} rx="1.2" ry="2" fill="#4a3f33" />
          <path d={`M${at.x} ${at.y - 1}l-1.8 3.4h1.2ZM${at.x} ${at.y - 1}l1.8 3.4h-1.2Z`} fill="#c9d3d6" opacity="0.8" />
          {sound(at.x + 2.4, at.y - 1)}
        </g>
      ),
    };
  }
  if (bug === 'cricket') {
    const at = { x: stone.x - stone.s * 1.15, y: stone.y - 0.6 };
    return {
      front: (
        <g transform={zoom(at, 1.8)}>
          <ellipse cx={at.x} cy={at.y - 1} rx="1.7" ry="0.9" fill="#5b4532" />
          <path d={`M${at.x - 1.4} ${at.y - 1.4}q-2 -2.4 -3.6 -2.2M${at.x + 1} ${at.y - 0.6}l1.6 1.6`} className="niwa-sound" />
          {sound(at.x - 6.5, at.y - 4)}
        </g>
      ),
    };
  }
  const draw: Record<Exclude<BugKind, 'cicada' | 'cricket'>, ReactNode> = {
    mantis: (
      <g stroke="#7fae55" strokeWidth="0.8" strokeLinecap="round" fill="none">
        <path
          d={`M${p.x} ${p.y}l5 -1.5M${p.x} ${p.y}l-1.5 -3.5M${p.x - 1.5} ${p.y - 3.5}l-1.6 1.2M${p.x + 1.6} ${p.y - 0.5}l0.6 1.6M${p.x + 3.6} ${p.y - 1}l0.6 1.8`}
        />
        <path d={`M${p.x - 1.5} ${p.y - 3.5}l-0.8 -1.5 1.6 0.2Z`} fill="#7fae55" />
      </g>
    ),
    worm: <path d={`M${p.x - 4} ${p.y}q1.5 -1.6 3 0t3 0t3 0`} fill="none" stroke="#c98d88" strokeWidth="1.1" strokeLinecap="round" />,
    knot: (
      <path
        d={`M${p.x - 3} ${p.y}c0 -2 4 -2.4 4 -0.6s-3.6 1.6 -3.2 -0.4 3.8 -1.6 4.6 0.4`}
        fill="none"
        stroke="#c98d88"
        strokeWidth="1"
        strokeLinecap="round"
      />
    ),
    beetle: (
      <g>
        <path d={`M${p.x - 1.8} ${p.y}a1.8 1.5 0 0 1 3.6 0Z`} fill="#3f4a3c" />
        <path d={`M${p.x - 1.4} ${p.y}l-0.8 0.8M${p.x + 1.4} ${p.y}l0.8 0.8`} stroke="#3f4a3c" strokeWidth="0.4" />
      </g>
    ),
    burrow: (
      <g>
        <ellipse cx={p.x} cy={p.y} rx="2.6" ry="1.2" fill="#8c8170" />
        <ellipse cx={p.x} cy={p.y - 0.1} rx="1.5" ry="0.6" fill="#4e463c" />
        <path d={`M${p.x + 3} ${p.y + 0.8}a1.4 1.1 0 0 1 2.8 0Z`} fill="#3f4a3c" />
      </g>
    ),
    frog: (
      <g>
        <ellipse cx={p.x} cy={p.y - 1.4} rx="2.4" ry="1.6" fill="#7aa45a" />
        <circle cx={p.x - 1.2} cy={p.y - 2.9} r="0.75" fill="#7aa45a" />
        <circle cx={p.x + 0.4} cy={p.y - 3} r="0.75" fill="#7aa45a" />
        <circle cx={p.x - 1.2} cy={p.y - 3} r="0.3" fill="#1d2023" />
        <circle cx={p.x + 0.4} cy={p.y - 3.1} r="0.3" fill="#1d2023" />
        {sound(p.x + 3.2, p.y - 2.6)}
      </g>
    ),
  };
  return {
    objects: [
      {
        y: p.y,
        node: (
          <g key="bug" transform={zoom(p, 1.8)}>
            {draw[bug]}
          </g>
        ),
      },
    ],
  };
}

/** 这一候的小景分到各层。pool 由 Garden 画在水钵里，这里不管。 */
export function sceneLayers(scene: Scene, ctx: SceneContext): Layers {
  const { rand, night, season, free } = ctx;
  switch (scene.kind) {
    case 'geese':
      return { sky: <Geese /> };
    case 'swallows':
      return { sky: <Swallows /> };
    case 'hawk':
      return { sky: <Hawk /> };
    case 'rainbow':
      return night ? { sky: <Clouds /> } : { sky: <Rainbow /> };
    case 'clouds':
      return { sky: <Clouds bolt={scene.bolt} /> };
    case 'rain':
      return {
        sky: <Clouds />,
        ground: each(free(6), (p) => <ellipse className="niwa-ripple" cx={f1(p.x)} cy={f1(p.y)} rx="2.4" ry="1.2" />),
        front: (
          <g className="niwa-rain">
            {airborne(rand, 28, [-100, -66, 104, 52]).map((d, i) => (
              <line key={i} x1={f1(d.x)} y1={f1(d.y)} x2={f1(d.x - 1.8)} y2={f1(d.y + 6)} />
            ))}
          </g>
        ),
      };
    case 'mist':
      return {
        front: (
          <g className="niwa-haze">
            <ellipse cx="-36" cy="-14" rx="62" ry="5" />
            <ellipse cx="40" cy="6" rx="66" ry="6" />
            <ellipse cx="-30" cy="28" rx="56" ry="5" />
          </g>
        ),
      };
    case 'snowfall':
      return {
        sky: <Clouds />,
        front: (
          <g className="niwa-flake">
            {airborne(rand, 38, [-100, -74, 100, 50]).map((d, i) => (
              <circle key={i} cx={f1(d.x)} cy={f1(d.y)} r={f1(1 + d.tone * 1.2)} />
            ))}
          </g>
        ),
      };
    case 'frost':
      return {
        frost: true,
        // 砂面整片泛白，再撒上冰晶
        ground: (
          <g>
            <rect className="niwa-frost-sheet" x="-90" y="-46" width="180" height="92" />
            <g className="niwa-frost-line">
              {free(16).map((p, i) => (
                <path
                  key={i}
                  d={`M${f1(p.x - 2.4)} ${f1(p.y)}h4.8M${f1(p.x - 1.2)} ${f1(p.y - 1.6)}l2.4 3.2M${f1(p.x + 1.2)} ${f1(p.y - 1.6)}l-2.4 3.2`}
                />
              ))}
            </g>
          </g>
        ),
      };
    case 'dew':
      return {
        ground: each(free(9), (p) => (
          <g>
            <circle className="niwa-dew" cx={f1(p.x)} cy={f1(p.y - 1.4)} r="1.7" />
            <circle cx={f1(p.x - 0.5)} cy={f1(p.y - 2)} r="0.5" fill="#fff" />
          </g>
        )),
      };
    case 'fireflies':
      return {
        front: each(
          free(8).map((p, i) => ({ x: p.x, y: p.y - 10 - ((i * 7) % 26) })),
          (p) =>
            night ? (
              <g transform={`translate(${f1(p.x)} ${f1(p.y)})`}>
                <circle r="6" fill="url(#niwa-glow)" />
                <circle r="1.1" fill="#fff6c4" />
              </g>
            ) : (
              <circle cx={f1(p.x)} cy={f1(p.y)} r="1.4" fill="#d8c75a" />
            ),
        ),
      };
    case 'wind':
      return {
        front: (
          <g>
            <g className="niwa-wind">
              <path d="M-96 -30c10 -4 18 -4 26 0s14 3 22 -2" />
              <path d="M18 -58c9 -3 16 -3 23 0s13 3 21 -2" />
              <path d="M30 34c8 -3 14 -3 20 0s11 2 18 -2" />
            </g>
            {airborne(rand, 5, [-60, -60, 90, 20]).map((d, i) => (
              <Petal key={i} {...d} color={SEASON_LEAF[season]} />
            ))}
          </g>
        ),
      };
    case 'leaves':
      return {
        front: airborne(rand, 16, [-70, -76, 70, 30]).map((d, i) => (
          <Petal key={i} {...d} color={['#d9633d', '#e79d3f', '#c2462f', '#d7b04a'][Math.floor(d.tone * 4)]!} />
        )),
      };
    case 'petals':
      return {
        ground: each(free(8), (p, i) => <Petal {...p} turn={i * 47} color={scene.color} />),
        front: airborne(rand, 10, [-40, -74, 70, 0]).map((d, i) => <Petal key={i} {...d} color={scene.color} />),
      };
    case 'flowers':
      return { objects: free(7).map((p, i) => ({ y: p.y, node: <Flower key={`f${i}`} {...p} color={scene.color} /> })) };
    case 'sprouts':
      return {
        ground: (
          <path
            d={free(12)
              .map((p) => tuft(p.x, p.y))
              .join('')}
            fill="none"
            stroke={scene.color}
            strokeWidth="1.1"
            strokeLinecap="round"
          />
        ),
      };
    case 'grain':
      return {
        objects: [
          [56, -10],
          [61, -7],
          [66, -4],
          [52, -6],
          [58, -3],
          [63, 0],
        ].map(([x, y], i) => ({
          y: y!,
          node: (
            <g key={`g${i}`} transform={`translate(${x} ${y}) scale(1.5) translate(${-x!} ${-y!})`}>
              <path d={`M${x} ${y}q-0.4 -6 1 -11`} stroke="#b99a52" strokeWidth="0.7" fill="none" />
              <ellipse cx={x! + 1.3} cy={y! - 12.4} rx="1.1" ry="2.6" fill="#d9b45a" transform={`rotate(14 ${x! + 1.3} ${y! - 12.4})`} />
            </g>
          ),
        })),
      };
    case 'antler': {
      const [p] = free(1) as [Point];
      return {
        objects: [
          {
            y: p.y,
            node: (
              <path
                key="antler"
                transform={`translate(${f1(p.x)} ${f1(p.y)}) scale(1.8) translate(${f1(-p.x)} ${f1(-p.y)})`}
                d={`M${f1(p.x - 4)} ${f1(p.y)}q4 -2.4 8.5 -1M${f1(p.x - 1)} ${f1(p.y - 1.4)}q-0.4 -2.6 1.2 -4M${f1(p.x + 2.4)} ${f1(p.y - 1.7)}q0.6 -2.2 2.6 -3`}
                fill="none"
                stroke="#cdb99c"
                strokeWidth="1"
                strokeLinecap="round"
              />
            ),
          },
        ],
      };
    }
    case 'bird':
      return birdLayers(scene.bird, ctx);
    case 'bug':
      return bugLayers(scene.bug, ctx);
    case 'pool':
      return {};
  }
}

/** 水钵：石头凿的圆钵，里面的水随这一候结冰、化冻、长萍、游鱼 */
export function Basin({ x, y, pool }: Point & { pool: Pool | null }) {
  const top = y - 5;
  const iced = pool === 'ice' || pool === 'thick' || pool === 'thaw' || pool === 'fishIce';
  return (
    <g transform={zoom({ x, y }, 1.45)}>
      <ellipse className="niwa-shadow" cx={x + 4} cy={y + 1} rx="12" ry="4.5" />
      <path className="niwa-basin" d={`M${x - 9} ${top}v5a9 4.5 0 0 0 18 0v-5Z`} />
      <ellipse className="niwa-basin-top" cx={x} cy={top} rx="9" ry="4.5" />
      <ellipse className="niwa-basin" cx={x} cy={top + 0.4} rx="6.8" ry="3.3" />
      {pool === 'low' ? (
        <ellipse className="niwa-water" cx={x} cy={top + 1.2} rx="5" ry="2.3" />
      ) : (
        <ellipse className="niwa-water" cx={x} cy={top + 0.5} rx="6.6" ry="3.15" />
      )}
      {(pool === 'fish' || pool === 'fishIce') && (
        <g>
          <path d={`M${x - 3} ${top}q1.6 -1 3.2 0q-1.6 1 -3.2 0Zm3.2 0l1.4 -0.9v1.8Z`} fill="#e07a45" />
          <path d={`M${x + 1} ${top + 1.6}q1.4 -0.8 2.8 0q-1.4 0.8 -2.8 0Zm2.8 0l1.2 -0.8v1.6Z`} fill="#eaa06d" />
        </g>
      )}
      {iced && (
        <ellipse
          className="niwa-ice"
          cx={x}
          cy={top + 0.5}
          rx="6.6"
          ry="3.15"
          opacity={pool === 'thick' ? 1 : pool === 'fishIce' ? 0.6 : 0.85}
        />
      )}
      {iced && (
        <path
          d={`M${x - 3.6} ${top - 0.6}l2.4 -0.9M${x + 1.2} ${top + 1.4}l2.2 -0.8`}
          stroke="#fff"
          strokeWidth="0.5"
          strokeLinecap="round"
        />
      )}
      {pool === 'thaw' && (
        <path d={`M${x - 5} ${top + 0.4}l2.6 -0.6 1.4 1.2 2.4 -1.4 1.6 0.8 2.6 -0.6`} fill="none" className="niwa-crack" />
      )}
      {(pool === 'ripple' || pool === 'clam') && (
        <g fill="none" stroke="#fff" strokeWidth="0.45" opacity="0.8">
          <ellipse cx={x + 1} cy={top + 0.6} rx="1.6" ry="0.8" />
          <ellipse cx={x + 1} cy={top + 0.6} rx="3.6" ry="1.7" />
        </g>
      )}
      {pool === 'duckweed' &&
        [
          [-3, -0.4],
          [-1.6, 1],
          [0.6, -1.2],
          [2.4, 0.6],
          [3.6, -0.6],
          [-4.2, 0.8],
          [1, 1.6],
        ].map(([dx, dy], i) => <ellipse key={i} cx={x + dx!} cy={top + 0.5 + dy!} rx="0.8" ry="0.45" fill="#8fb35a" />)}
      {pool === 'clam' && <path d={`M${x + 7.2} ${top + 2.4}a2 1.6 0 0 1 3.6 0Z`} fill="#e6dccb" stroke="#bfb19b" strokeWidth="0.3" />}
    </g>
  );
}

// 截 README 用的图：用无头 Edge 打开构建好的新标签页，先写进一套演示数据，浅色、深色各截一张（布局不同，多展示几种小组件），存到 docs/images/。
// 用法：pnpm screenshots（会先构建）。和页面测试一样用独立的临时配置目录，不碰日常用的浏览器数据。
// 天气用的是写好的缓存，日程是这里生成的演示日历；只有快捷方式的图标要联网，从 icon.horse 取，再按 utils/icons/image.ts 同样的规则统一成 128px。

import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../.output/edge-mv3/', import.meta.url));
// 可以指定输出目录（宣传片用 promo/public）。这时多截一张网格是空的浅色页，宣传片里让格子在它上面一个个出现。
const images = process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL('../docs/images/', import.meta.url));
const shots = process.argv[2] ? ['light', 'dark', 'light-empty'] : ['light', 'dark'];
await mkdir(images, { recursive: true });
const edge = process.env.EDGE_BIN ?? '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const day = (n) => ymd(new Date(Date.now() + n * 86_400_000));

/** 接下来几天的演示日程 */
const demoIcs = () =>
  [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'X-WR-CALNAME:生活',
    ...[
      [0, '1400', '1500', '周会'],
      [0, '1930', '2030', '夜跑'],
      [1, '1000', '1130', '读书会'],
      [2, '1200', '1330', '和朋友吃饭'],
      [4, '1500', '1600', '牙医复诊'],
    ].flatMap(([n, from, to, title], i) => [
      'BEGIN:VEVENT',
      `UID:demo-${i}`,
      `DTSTART:${day(n)}T${from}00`,
      `DTEND:${day(n)}T${to}00`,
      `SUMMARY:${title}`,
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
  ].join('\r\n');

/** 快捷方式：图标从 /icon/<域名> 取，由设置页统一成图片图标 */
const link = (id, name, host, x, y) => ({ id, kind: 'link', name, url: `https://${host}/`, icon: { kind: 'image' }, x, y });
const workFolder = (x, y) => ({
  id: 'f1',
  kind: 'folder',
  name: '工作',
  x,
  y,
  links: [
    link('f1a', 'Gmail', 'mail.google.com'),
    link('f1b', '飞书', 'www.feishu.cn'),
    link('f1c', 'Linear', 'linear.app'),
    link('f1d', 'Vercel', 'vercel.com'),
  ],
});
/** 4×2 的一块：七个快捷方式和一个文件夹 */
const shortcutBlock = (x0) => [
  link('l1', 'GitHub', 'github.com', x0, 0),
  link('l2', '公众号', 'mp.weixin.qq.com', x0 + 1, 0),
  link('l3', 'Notion', 'www.notion.so', x0 + 2, 0),
  link('l4', 'YouTube', 'www.youtube.com', x0 + 3, 0),
  link('l5', 'X', 'x.com', x0, 1),
  link('l6', '小红书', 'www.xiaohongshu.com', x0 + 1, 1),
  link('l7', '知乎', 'www.zhihu.com', x0 + 2, 1),
  workFolder(x0 + 3, 1),
];

/** 写进 localStorage 的演示数据（键见 utils/storage.ts） */
function demoData(origin, theme, empty) {
  const now = Date.now();
  const hour = 3_600_000;
  const place = { id: '101210101', name: '杭州', region: '浙江省', lat: 30.25, lon: 120.21 };
  const forecast = {
    offset: 8 * hour,
    current: { temp: 18, feels: 17, humidity: 64, wind: 9, code: 101, text: '多云', day: true },
    hours: [17, 17, 16, 15, 14, 14].map((temp, i) => ({ time: now + (i + 1) * hour, temp, code: i < 2 ? 101 : 100, day: true })),
    days: [
      [101, 21, 13, '多云'],
      [100, 23, 14, '晴'],
      [305, 19, 14, '小雨'],
      [104, 18, 12, '阴'],
      [100, 22, 12, '晴'],
      [100, 23, 13, '晴'],
      [101, 21, 14, '多云'],
    ].map(([code, max, min, text], i) => ({ time: now + i * 24 * hour, code, max, min, text })),
  };
  const notes = {
    notes: [
      { id: 'n1', text: '周五前交季度总结' },
      { id: 'n2', text: '买菜：番茄、鸡蛋、青菜' },
      { id: 'n3', text: '给妈妈打电话' },
    ],
  };
  const timer = { mode: 'countdown', duration: 25 * 60_000, elapsed: 0, startedAt: now - 7 * 60_000 - 23_000 };
  // 浅色：左边一块大天气，中间快捷方式和便签，右边日程、庭和三个快捷方式
  const lightGrid = [
    { id: 'w1', kind: 'widget', type: 'weather', size: 'l', x: 0, y: 0, settings: { place } },
    ...shortcutBlock(4),
    { id: 'w2', kind: 'widget', type: 'calendar', size: 'm', x: 8, y: 0 },
    { id: 'w3', kind: 'widget', type: 'notes', size: 'm', x: 4, y: 2, settings: notes },
    { id: 'w4', kind: 'widget', type: 'garden', size: 's', x: 8, y: 2 },
    link('l8', 'Figma', 'www.figma.com', 10, 2),
    link('l9', 'ChatGPT', 'chatgpt.com', 11, 2),
    link('l10', '微信读书', 'weread.qq.com', 10, 3),
  ];
  // 深色：世界时钟和计时器在左，快捷方式和日程居中，右边天气、夜里的庭（石灯笼亮着）、几个快捷方式和小便签
  const darkGrid = [
    { id: 'w1', kind: 'widget', type: 'worldclock', size: 'm', x: 0, y: 0, settings: { cities: ['london', 'newyork', 'tokyo'] } },
    { id: 'w2', kind: 'widget', type: 'timer', size: 'm', x: 0, y: 2, settings: { timer } },
    ...shortcutBlock(4),
    { id: 'w3', kind: 'widget', type: 'weather', size: 's', x: 8, y: 0, settings: { place } },
    { id: 'w4', kind: 'widget', type: 'garden', size: 's', x: 10, y: 0 },
    { id: 'w5', kind: 'widget', type: 'calendar', size: 'm', x: 4, y: 2 },
    link('l8', 'Apple Music', 'music.apple.com', 8, 2),
    link('l9', '维基百科', 'zh.wikipedia.org', 9, 2),
    link('l10', 'Obsidian', 'obsidian.md', 8, 3),
    { id: 'w6', kind: 'widget', type: 'notes', size: 's', x: 10, y: 2, settings: notes },
  ];
  const today = new Date();
  const dayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  return {
    'niwa:theme': theme,
    'niwa:grid': JSON.stringify(empty ? [] : theme === 'dark' ? darkGrid : lightGrid),
    // 空网格时把「添加」放到截图下面看不到的地方
    'niwa:add': JSON.stringify(empty ? { x: 0, y: 30 } : theme === 'dark' ? { x: 9, y: 3 } : { x: 11, y: 3 }),
    'niwa:garden': JSON.stringify({ first: '2026-01-01', last: dayKey, days: 30 }),
    'niwa:calendars': JSON.stringify([{ id: 'c1', url: `${origin}/demo.ics`, name: '生活', color: '#4f6b80' }]),
    'niwa:weather-account': JSON.stringify({ host: 'demo.re.qweatherapi.com', key: 'demo' }),
    'niwa:weather-forecast': JSON.stringify({ [`${place.id}|demo.re.qweatherapi.com|demo`]: { fetchedAt: now, forecast, error: null } }),
  };
}

// icon.horse 时好时坏：取到的存在临时目录里，下次直接用；连不上时再试两次
const iconCache = join(tmpdir(), 'niwa-icon-cache');
await mkdir(iconCache, { recursive: true });
/** 网站图标（icon.horse）。不带 content-type，浏览器按内容认出是 png 还是 ico */
async function fetchIcon(host) {
  const file = join(iconCache, host);
  try {
    return await readFile(file);
  } catch {
    for (let attempt = 1; ; attempt++) {
      try {
        const r = await fetch(`https://icon.horse/icon/${host}`, { signal: AbortSignal.timeout(15_000) });
        if (!r.ok) throw new Error(`取不到 ${host} 的图标：${r.status}`);
        const body = Buffer.from(await r.arrayBuffer());
        await writeFile(file, body);
        return body;
      } catch (error) {
        if (attempt === 3) throw error;
      }
    }
  }
}

/** 在页面里运行：和 utils/icons/image.ts 的 toIconImage 同样的规则（四角透明或不是方形的放在白底上留边） */
async function toIconImage(blob) {
  const img = new Image();
  img.src = URL.createObjectURL(blob);
  await img.decode();
  const { naturalWidth: w, naturalHeight: h } = img;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, 128, 128);
  const corners = [0, 127].flatMap((x) => [0, 127].map((y) => ctx.getImageData(x, y, 1, 1).data[3]));
  if (w !== h || corners.some((a) => a < 250)) {
    const scale = (128 - 44) / Math.max(w, h);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 128, 128);
    ctx.drawImage(img, (128 - w * scale) / 2, (128 - h * scale) / 2, w * scale, h * scale);
  }
  return canvas.toDataURL('image/webp', 0.9);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/demo.ics') {
    res.writeHead(200, { 'content-type': 'text/calendar; charset=utf-8' });
    return res.end(demoIcs());
  }
  if (url.pathname.startsWith('/icon/')) {
    return res.end(await fetchIcon(url.pathname.slice('/icon/'.length)));
  }
  // 先写好演示数据、取好图标，再跳到新标签页（同一个源，localStorage 是同一份）
  if (url.pathname === '/shot.html') {
    const shot = url.searchParams.get('shot');
    const data = demoData(origin, shot.startsWith('dark') ? 'dark' : 'light', shot.endsWith('-empty'));
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(`<script>
localStorage.clear();
Object.entries(${JSON.stringify(data)}).forEach(([k, v]) => localStorage.setItem(k, v));
${toIconImage}
const links = JSON.parse(localStorage.getItem('niwa:grid')).flatMap((i) => (i.kind === 'folder' ? i.links : i.kind === 'link' ? [i] : []));
Promise.all(links.map(async (l) => [l.id, await toIconImage(await (await fetch('/icon/' + new URL(l.url).host)).blob())])).then((icons) => {
  localStorage.setItem('niwa:icons', JSON.stringify(Object.fromEntries(icons)));
  location.replace('/newtab.html');
});
</script>`);
  }
  const file = normalize(join(dist, url.pathname.slice(1)));
  if (!file.startsWith(dist)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

for (const shot of shots) {
  const profile = await mkdtemp(join(tmpdir(), 'niwa-shot-'));
  try {
    await new Promise((resolve, reject) =>
      execFile(
        edge,
        [
          '--headless=new',
          '--disable-gpu',
          `--user-data-dir=${profile}`,
          '--hide-scrollbars',
          '--force-prefers-reduced-motion',
          '--window-size=1440,900',
          '--force-device-scale-factor=2',
          '--virtual-time-budget=8000',
          `--screenshot=${join(images, `${shot}.png`)}`,
          `${origin}/shot.html?shot=${shot}`,
        ],
        { timeout: 120_000 },
        (error) => (error ? reject(error) : resolve()),
      ),
    );
    console.log(join(images, `${shot}.png`));
  } finally {
    await rm(profile, { recursive: true, force: true });
  }
}
server.close();

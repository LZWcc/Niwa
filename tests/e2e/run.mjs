// 页面测试：用无头 Edge 打开构建好的新标签页（.output/edge-mv3），跑 tests/e2e/*.test.html 里的检查。
// 用法：pnpm test:e2e（会先构建）。Edge 不在默认位置时设置 EDGE_BIN。
//
// 自带一个小服务器：/newtab.html 等扩展文件来自构建目录，/__tests__/ 下是测试页，
// /sample.ics、/sample2.ics 是按今天生成的测试日历。不往构建目录里写任何东西。

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { horseSvg, letterSvg, logoSvg, sampleIcs, siteHtml } from './fixtures.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const dist = fileURLToPath(new URL('../../.output/edge-mv3/', import.meta.url));
const edge = process.env.EDGE_BIN ?? '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';

// done：最后一条检查的文字，没出现说明测试中途卡住或页面出错。
const suites = [
  // 无头模式的虚拟时间里动画不会推进，所以关掉动效（也顺带覆盖“减少动态效果”的路径）。
  { file: 'main.test.html', flags: ['--force-prefers-reduced-motion'], done: 'positions persist after reload' },
  { file: 'defaults.test.html', flags: ['--force-prefers-reduced-motion'], done: 'icons kept after reload' },
  { file: 'calendars.test.html', flags: [], done: 'month shows failure reasons' },
  { file: 'calendar-files.test.html', flags: ['--force-prefers-reduced-motion'], done: 'removing deletes the file' },
  { file: 'icons.test.html', flags: ['--force-prefers-reduced-motion'], done: 'deleting shortcut removes its image' },
  { file: 'backup.test.html', flags: ['--force-prefers-reduced-motion'], done: 'calendar files restored' },
  { file: 'browsing.test.html', flags: ['--force-prefers-reduced-motion'], done: 'suggestions turned back on' },
  { file: 'widgets.test.html', flags: ['--force-prefers-reduced-motion'], done: 'removing a notes widget drops its notes' },
  { file: 'worldclock.test.html', flags: ['--force-prefers-reduced-motion'], done: 'second world clock has its own cities' },
  { file: 'timer.test.html', flags: ['--force-prefers-reduced-motion'], done: 'stopwatch counting' },
  { file: 'alarm.test.html', flags: [], done: 'restart runs the same duration again' },
  { file: 'folders.test.html', flags: ['--force-prefers-reduced-motion'], done: 'folders done' },
  { file: 'feeds.test.html', flags: ['--force-prefers-reduced-motion'], done: 'card after removal' },
  { file: 'hotlist.test.html', flags: ['--force-prefers-reduced-motion'], done: 'clicking the title row opens panel' },
  { file: 'settings.test.html', flags: ['--force-prefers-reduced-motion'], done: 'backup opens from settings' },
  { file: 'almanac.test.html', flags: ['--force-prefers-reduced-motion'], done: 'no moon phase on the sun in light theme' },
  { file: 'weather-cache.test.html', flags: ['--force-prefers-reduced-motion'], done: 'no request while cache is fresh' },
  { file: 'weather.test.html', flags: ['--force-prefers-reduced-motion'], done: 'scene restored when widget removed' },
];

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

if (!existsSync(join(dist, 'newtab.html'))) {
  console.error('找不到 .output/edge-mv3/newtab.html，先运行 pnpm exec wxt build -b edge');
  process.exit(1);
}
if (!existsSync(edge)) {
  console.error(`找不到 Edge：${edge}（用 EDGE_BIN 指定）`);
  process.exit(1);
}

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/sample.ics' || path === '/sample2.ics') {
    res.writeHead(200, { 'content-type': 'text/calendar; charset=utf-8' });
    return res.end(sampleIcs(path === '/sample.ics' ? '测试日历' : '第二个日历'));
  }
  // 测试页等待真实的异步操作时用：请求挂起期间无头模式的虚拟时间会暂停。
  if (path === '/__tick') return setTimeout(() => res.end(), 20);
  // 获取网站图标用的假网站：/site/ 声明了图标，/plain/ 什么都没声明。
  if (path === '/site/' || path === '/plain/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(path === '/site/' ? siteHtml : '<!doctype html><title>plain</title>');
  }
  // 第三方图标服务的假响应（测试页把对它们的请求转到这里）：icon.horse 的真图标和占位图（占位图的缓存时间特别短）。
  if (path === '/fake-icon/horse.svg' || path === '/fake-icon/horse-placeholder.svg') {
    const placeholder = path.endsWith('placeholder.svg');
    res.writeHead(200, {
      'content-type': 'image/svg+xml',
      'cache-control': placeholder ? 'public, max-age=604800, s-maxage=300' : 'public, max-age=604800, s-maxage=2592000',
    });
    return res.end(placeholder ? letterSvg : horseSvg);
  }
  if (path === '/site/logo.svg') {
    res.writeHead(200, { 'content-type': 'image/svg+xml' });
    return res.end(logoSvg);
  }
  const [base, rel] = path.startsWith('/__tests__/') ? [here, path.slice('/__tests__/'.length)] : [dist, path.slice(1)];
  const file = normalize(join(base, rel));
  if (!file.startsWith(base)) return res.writeHead(403).end();
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

const decode = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

/** 跑一个测试页，返回它输出的 PASS / FAIL 行。 */
async function runSuite({ file, flags }) {
  // 独立的临时配置目录，不碰日常用的浏览器数据。
  const profile = await mkdtemp(join(tmpdir(), 'niwa-e2e-'));
  try {
    const dom = await new Promise((resolve, reject) =>
      execFile(
        edge,
        [
          '--headless=new',
          '--disable-gpu',
          `--user-data-dir=${profile}`,
          ...flags,
          '--virtual-time-budget=60000',
          '--dump-dom',
          `${origin}/__tests__/${file}`,
        ],
        { maxBuffer: 64 * 1024 * 1024, timeout: 180_000 },
        (error, stdout) => (error && !stdout ? reject(error) : resolve(stdout)),
      ),
    );
    const out = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/)?.[1] ?? '';
    return decode(out)
      .split('\n')
      .filter((line) => /^(PASS|FAIL) /.test(line));
  } finally {
    await rm(profile, { recursive: true, force: true });
  }
}

let failed = false;
for (const suite of suites) {
  const lines = await runSuite(suite);
  const fails = lines.filter((line) => line.startsWith('FAIL'));
  const finished = lines.some((line) => line.includes(suite.done));
  console.log(`${suite.file}: ${lines.length - fails.length} passed, ${fails.length} failed${finished ? '' : '（没有跑完）'}`);
  for (const line of fails) console.log(`  ${line}`);
  if (fails.length || !finished) failed = true;
}
server.close();
process.exitCode = failed ? 1 : 0;

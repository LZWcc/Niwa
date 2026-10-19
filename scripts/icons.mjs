// 由 docs/images/icon.svg 生成扩展图标 public/icon/<尺寸>.png。用法：pnpm icons。
// 在无头 Edge 里用 canvas 按每个尺寸直接画 SVG（小尺寸也清楚，不是从大图缩小），PNG 数据从 --dump-dom 读回来。

import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SIZES = [16, 32, 48, 96, 128];
const svg = await readFile(fileURLToPath(new URL('../docs/images/icon.svg', import.meta.url)), 'utf8');
const out = fileURLToPath(new URL('../public/icon/', import.meta.url));
const edge = process.env.EDGE_BIN ?? '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';

const page = `<!doctype html><pre id="out"></pre><script>
const img = new Image();
img.onload = () => {
  document.getElementById('out').textContent = ${JSON.stringify(SIZES)}.map((s) => {
    const c = document.createElement('canvas');
    c.width = c.height = s;
    c.getContext('2d').drawImage(img, 0, 0, s, s);
    return s + ' ' + c.toDataURL('image/png');
  }).join('\\n');
};
img.src = 'data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}';
</script>`;

const dir = await mkdtemp(join(tmpdir(), 'niwa-icons-'));
try {
  await writeFile(join(dir, 'render.html'), page);
  const dom = await new Promise((resolve, reject) =>
    execFile(
      edge,
      [
        '--headless=new',
        '--disable-gpu',
        `--user-data-dir=${join(dir, 'profile')}`,
        '--virtual-time-budget=3000',
        '--dump-dom',
        `file://${join(dir, 'render.html')}`,
      ],
      { maxBuffer: 16 * 1024 * 1024, timeout: 60_000 },
      (error, stdout) => (error && !stdout ? reject(error) : resolve(stdout)),
    ),
  );
  for (const [, size, data] of dom.matchAll(/(?:^|>)(\d+) data:image\/png;base64,(\S+)$/gm)) {
    await writeFile(join(out, `${size}.png`), Buffer.from(data, 'base64'));
    console.log(`public/icon/${size}.png`);
  }
} finally {
  await rm(dir, { recursive: true, force: true });
}

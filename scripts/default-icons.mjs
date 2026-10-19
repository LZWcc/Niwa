// 生成 utils/icons/defaults.ts：默认快捷方式（config.ts 的 DEFAULT_ITEMS 里用图片图标的）的图标打包进扩展，
// 第一次打开不用联网就有清晰的图标。从 icon.horse 取，在无头 Edge 里按 utils/icons/image.ts 的规则统一成 128px webp。
// 用法：pnpm default-icons（改了默认快捷方式之后）。

import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_ITEMS } from '../config.ts';
import { fetchIcon, toIconImage } from './icon-image.mjs';

const edge = process.env.EDGE_BIN ?? '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const links = DEFAULT_ITEMS.flatMap((i) => (i.kind === 'folder' ? i.links : i.kind === 'link' ? [i] : [])).filter(
  (l) => l.icon?.kind === 'image',
);
const sources = await Promise.all(links.map(async (l) => [l.id, (await fetchIcon(new URL(l.url).host)).toString('base64')]));

const page = `<!doctype html><pre id="out"></pre><script>
${toIconImage}
const sources = ${JSON.stringify(sources)};
Promise.all(sources.map(async ([id, b64]) => id + ' ' + (await toIconImage(new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))]))))).then((lines) => {
  document.getElementById('out').textContent = lines.join('\\n');
});
</script>`;

const dir = await mkdtemp(join(tmpdir(), 'niwa-default-icons-'));
try {
  await writeFile(join(dir, 'render.html'), page);
  const dom = await new Promise((resolve, reject) =>
    execFile(
      edge,
      [
        '--headless=new',
        '--disable-gpu',
        `--user-data-dir=${join(dir, 'profile')}`,
        '--virtual-time-budget=5000',
        '--dump-dom',
        `file://${join(dir, 'render.html')}`,
      ],
      { maxBuffer: 16 * 1024 * 1024, timeout: 60_000 },
      (error, stdout) => (error && !stdout ? reject(error) : resolve(stdout)),
    ),
  );
  const icons = new Map([...dom.matchAll(/(?:^|>)([\w-]+) (data:image\/webp;base64,[\w+/=]+)(?=$|<)/gm)].map(([, id, src]) => [id, src]));
  const missing = links.filter((l) => !icons.has(l.id)).map((l) => l.id);
  if (missing.length) throw new Error(`没有生成这些图标：${missing.join('、')}`);
  const body = [
    '// 由 scripts/default-icons.mjs 生成，不要手改（改了 config.ts 的默认快捷方式后运行 pnpm default-icons）。',
    '// 默认快捷方式的图标（128px webp）打包在扩展里，第一次打开时写进 niwa:icons，不用联网。图标的商标归各网站所有。',
    "import type { IconStore } from './model';",
    '',
    'export const DEFAULT_ICONS: IconStore = {',
    ...links.map((l) => `  ${JSON.stringify(l.id)}: '${icons.get(l.id)}',`),
    '};',
    '',
  ].join('\n');
  await writeFile(fileURLToPath(new URL('../utils/icons/defaults.ts', import.meta.url)), body);
  console.log(`utils/icons/defaults.ts：${links.length} 个图标，${(body.length / 1024).toFixed(0)} KB`);
} finally {
  await rm(dir, { recursive: true, force: true });
}

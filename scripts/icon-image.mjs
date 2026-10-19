// 截图（screenshots.mjs）和默认图标（default-icons.mjs）共用：从 icon.horse 取网站图标，
// 以及在页面里把图片统一成 128px webp 的规则（和 utils/icons/image.ts 一样）。

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// icon.horse 时好时坏：取到的存在临时目录里，下次直接用；连不上时再试两次
const cache = join(tmpdir(), 'niwa-icon-cache');
await mkdir(cache, { recursive: true });

/** 网站图标（icon.horse）的原始数据。不带类型，浏览器按内容认出是 png 还是 ico */
export async function fetchIcon(host) {
  const file = join(cache, host);
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

/** 在页面里运行（转成字符串放进页面）：和 utils/icons/image.ts 的 toIconImage 同样的规则（四角透明或不是方形的放在白底上留边） */
export async function toIconImage(blob) {
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

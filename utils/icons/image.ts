// 把各种来源的图片（png、ico、svg、上传的照片）统一成 128px 的方形 webp data URL。
import { AppError } from '../errors';

const SIZE = 128;
// 只是个标志（四角透明或不是方形）时，缩小放在白底上，四周留这么宽的边。
const PADDING = 22;

/** 返回统一后的图片，和原图的边长（判断够不够清晰用；SVG 可以任意放大，算作足够大）。 */
export async function toIconImage(blob: Blob): Promise<{ src: string; size: number }> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode().catch((cause) => {
      throw new AppError('这个文件不是能用的图片', { cause });
    });
    const width = img.naturalWidth || SIZE;
    const height = img.naturalHeight || SIZE;

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, SIZE, SIZE);
    const corners = [0, SIZE - 1].flatMap((x) => [0, SIZE - 1].map((y) => ctx.getImageData(x, y, 1, 1).data[3]!));
    if (width !== height || corners.some((alpha) => alpha < 250)) {
      const scale = (SIZE - PADDING * 2) / Math.max(width, height);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.drawImage(img, (SIZE - width * scale) / 2, (SIZE - height * scale) / 2, width * scale, height * scale);
    }
    return { src: canvas.toDataURL('image/webp', 0.9), size: blob.type === 'image/svg+xml' ? Infinity : Math.min(width, height) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

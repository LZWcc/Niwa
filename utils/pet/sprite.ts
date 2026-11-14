// 宠物：导入 Codex 的宠物（~/.codex/pets/<名字>/ 里的 pet.json 和精灵图），浮在页面上，可以拖到任意位置。
// 精灵图 8 列，每格 192×208，每一行是一个动作，各帧的时长是 Codex 定好的（hatch-pet 的约定）；
// 第 2 版多两行，是 16 个方向的「看向」，视线跟着指针转。
// 原图 1536×2288，解码后约 14MB，每个新标签页各一份。导入时只留用到的行，缩成显示大小的两倍（Retina 屏上刚好清晰），
// 存成 webp 放进 IndexedDB，解码后不到 6MB。
import { STORES, transact } from '../db';
import { AppError } from '../errors';
import { hasStrings } from '../storage';
import type { Pet } from './model';

/** 原图一格的大小 */
const SOURCE = { w: 192, h: 208 };
/** 页面上显示的一格（CSS 像素） */
export const CELL = { w: 72, h: 78 };
/** 存下来的图一格多大：显示大小的两倍 */
const STORED = { w: CELL.w * 2, h: CELL.h * 2 };
const COLUMNS = 8;

const frames = (count: number, each: number, last: number) => [...Array<number>(count - 1).fill(each), last];

/** 用到的动作：在原图的第几行，每一帧停多少毫秒。存下来的图按这里的顺序一行一个，后面接看向的两行。 */
export const ACTIONS = {
  idle: { row: 0, frames: [280, 110, 110, 140, 140, 320] },
  /** 拖着往右、往左 */
  right: { row: 1, frames: frames(8, 120, 220) },
  left: { row: 2, frames: frames(8, 120, 220) },
  /** 点一下打招呼 */
  wave: { row: 3, frames: frames(4, 140, 280) },
  /** 计时器时间到了，等你来看 */
  waiting: { row: 6, frames: frames(6, 150, 260) },
  /** 计时器在走：Codex 里是「在干活」 */
  busy: { row: 7, frames: frames(6, 120, 220) },
};
export type PetAction = keyof typeof ACTIONS;

/** 每个动作在存下来的图里是第几行 */
export const ROW = Object.fromEntries(Object.keys(ACTIONS).map((name, i) => [name, i])) as Record<PetAction, number>;
/** 看向的两行接在动作后面：第一行是 0°–157.5°，第二行是 180°–337.5° */
export const LOOK_ROW = Object.keys(ACTIONS).length;

// 指针离宠物中心这么近（指在宠物身上）或这么远时不看，回到平常的样子。
const LOOK_NEAR = 40;
const LOOK_FAR = 420;

/** 指针在宠物中心的 (dx, dy) 处时看哪个方向：0 是正上方，顺时针每 22.5° 一个，共 16 个；不看时是 null */
export function lookAt(dx: number, dy: number): number | null {
  const distance = Math.hypot(dx, dy);
  if (distance < LOOK_NEAR || distance > LOOK_FAR) return null;
  const degrees = (Math.atan2(dx, -dy) * 180) / Math.PI + 360;
  return Math.round((degrees % 360) / 22.5) % 16;
}

/** 一个动作的关键帧：每一帧停在那一格，到时间直接跳到下一格（step-end）；duration 是一轮的总时长 */
export function actionKeyframes(action: PetAction): { keyframes: Keyframe[]; duration: number } {
  const durations = ACTIONS[action].frames;
  const duration = durations.reduce((sum, ms) => sum + ms, 0);
  let at = 0;
  const keyframes: Keyframe[] = durations.map((ms, i) => {
    const frame = { offset: at / duration, transform: `translateX(${-i * CELL.w}px)`, easing: 'step-end' };
    at += ms;
    return frame;
  });
  keyframes.push({ ...keyframes.at(-1), offset: 1 });
  return { keyframes, duration };
}

/** 从选的文件夹里读出宠物：pet.json 和它写的精灵图。裁好的图片存进 IndexedDB，返回名字和有没有看向（位置由调用的地方定）。 */
export async function importPet(files: File[]): Promise<Omit<Pet, 'x' | 'y'>> {
  const manifest = files.find((f) => f.name === 'pet.json');
  if (!manifest) throw new AppError('文件夹里没有 pet.json，请选 Codex 宠物的文件夹');
  let info: unknown;
  try {
    info = JSON.parse(await manifest.text());
  } catch (cause) {
    throw new AppError('pet.json 的格式不对', { cause });
  }
  if (!hasStrings('displayName', 'spritesheetPath')(info)) throw new AppError('pet.json 里缺少名字或精灵图');
  const sheetName = info.spritesheetPath.split('/').pop();
  const sheet = files.find((f) => f.name === sheetName);
  if (!sheet) throw new AppError(`文件夹里没有 ${info.spritesheetPath}`);

  const image = await createImageBitmap(sheet).catch((cause) => {
    throw new AppError('精灵图不是能用的图片', { cause });
  });
  // 第 1 版 9 行，第 2 版 11 行（多了看向）。按图的大小认，不看 pet.json 里写的版本。
  const { width, height } = image;
  const rows = height / SOURCE.h;
  if (width !== SOURCE.w * COLUMNS || (rows !== 9 && rows !== 11)) {
    image.close();
    throw new AppError(`精灵图的大小不对（${width}×${height}），Codex 的宠物是 1536×1872 或 1536×2288`);
  }
  const look = rows === 11;
  const keep = [...Object.values(ACTIONS).map((a) => a.row), ...(look ? [9, 10] : [])];
  const canvas = new OffscreenCanvas(STORED.w * COLUMNS, STORED.h * keep.length);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  keep.forEach((row, i) =>
    ctx.drawImage(image, 0, row * SOURCE.h, SOURCE.w * COLUMNS, SOURCE.h, 0, i * STORED.h, STORED.w * COLUMNS, STORED.h),
  );
  image.close();
  const sprite = await canvas.convertToBlob({ type: 'image/webp', quality: 0.9 });
  await transact(STORES.pet, 'readwrite', (store) => store.put(sprite, 'sprite'));
  return { id: crypto.randomUUID(), name: info.displayName, look };
}

/** 宠物的图片；没有（比如在别的浏览器里导入的）时是 undefined */
export const readPetSprite = () => transact<Blob | undefined>(STORES.pet, 'readonly', (store) => store.get('sprite'));

export const deletePetSprite = () => transact(STORES.pet, 'readwrite', (store) => store.delete('sprite'));

// 快捷方式的图标：网站图片，或文字图标（一两个字 + 背景色）。
// 图片统一缩成 128px 的 data URL，单独存在 niwa:icons 里（按快捷方式的 id 对上），不放进 niwa:grid：
// 拖动时每挪一格都会重写 niwa:grid，图片放进去会拖慢它。

import { ICONS } from '../../config';

export type TextIcon = { kind: 'text'; text: string; color: string };
/** 显示用的图标：图片带着数据 */
export type IconSpec = { kind: 'image'; src: string } | TextIcon;
/** 记在快捷方式上的图标：图片只记一个标记，数据在 niwa:icons */
export type LinkIcon = { kind: 'image' } | TextIcon;
/** niwa:icons：快捷方式 id → 图片的 data URL */
export type IconStore = Record<string, string>;

export const isLinkIcon = (v: unknown): v is LinkIcon => {
  const icon = v as LinkIcon | null;
  if (icon?.kind === 'image') return true;
  return icon?.kind === 'text' && typeof icon.text === 'string' && typeof icon.color === 'string';
};

export const isIconStore = (v: unknown): v is IconStore =>
  typeof v === 'object' &&
  v !== null &&
  !Array.isArray(v) &&
  Object.values(v).every((src) => typeof src === 'string' && src.startsWith('data:image/'));

/** 浏览器本地缓存的网站图标（Chromium 的 _favicon 接口，要 favicon 权限），不联网。 */
export const faviconUrl = (pageUrl: string, size: number) => `/_favicon/?${new URLSearchParams({ pageUrl, size: String(size) })}`;

/** 默认的文字图标：名称的第一个字；颜色按网站算，同一个网站总是同一种颜色。 */
export function defaultTextIcon(name: string, href: string | null): TextIcon {
  let hash = 0;
  for (const c of href ? new URL(href).hostname : name) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return { kind: 'text', text: ([...name.trim()][0] ?? '').toUpperCase(), color: ICONS.textColors[hash % ICONS.textColors.length]! };
}

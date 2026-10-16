// 浏览器里的收藏夹和历史记录：只读，数据来自浏览器的扩展接口，不联网。
import type { Browser } from 'wxt/browser';
import { DAY, hm, startOfDay } from './date';

export type BookmarkNode = Browser.bookmarks.BookmarkTreeNode;

/** 只显示网页：chrome://、edge://、javascript: 这类从新标签页点不开，扩展自己的页面也不算浏览过。 */
export const isWebUrl = (url: string | undefined): url is string => /^https?:\/\//.test(url ?? '');

export const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, '');

/** 历史里每一条右侧的时间：今天写时刻，昨天写“昨天”，更早写日期。 */
export function visitLabel(t: number, now: Date) {
  const days = Math.round((startOfDay(now.getTime()) - startOfDay(t)) / DAY);
  if (days === 0) return hm(t);
  if (days === 1) return '昨天';
  const d = new Date(t);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 从根到这个节点的路径（含两端）；找不到返回空数组。 */
export function pathTo(node: BookmarkNode, id: string): BookmarkNode[] {
  if (node.id === id) return [node];
  for (const child of node.children ?? []) {
    const path = pathTo(child, id);
    if (path.length) return [node, ...path];
  }
  return [];
}

/** 根节点没有名字，其余文件夹的名字由浏览器给（收藏夹栏、其他收藏夹等）。 */
export const folderName = (node: BookmarkNode) => node.title || '收藏夹';

/** 在全部收藏里按标题和网址搜索，只返回网页。 */
export function searchBookmarks(root: BookmarkNode, query: string): BookmarkNode[] {
  const q = query.trim().toLowerCase();
  const found: BookmarkNode[] = [];
  const walk = (node: BookmarkNode) => {
    if (isWebUrl(node.url) && `${node.title} ${node.url}`.toLowerCase().includes(q)) found.push(node);
    node.children?.forEach(walk);
  };
  walk(root);
  return found;
}

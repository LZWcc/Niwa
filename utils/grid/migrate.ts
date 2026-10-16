// 旧版本每种小组件只能放一个，便签、天气的城市、收藏夹的文件夹、历史的那一组各自单独存（LEGACY_KEYS）；
// 现在放在网格里每个小组件自己的 settings 里。页面启动时搬一次：搬到同一种的第一个小组件上，然后删掉旧的键。
// 网格里没有便签小组件、但有旧便签时，补一个便签小组件，便签不丢；其余的找不到小组件就不要了。
import { DEFAULT_ITEMS } from '../../config';
import { HISTORY_TABS, type HistoryTab } from '../browsing';
import { isNote } from '../notes';
import { KEYS, LEGACY_KEYS, readList, writeJson } from '../storage';
import { isPlace } from '../weather';
import type { WidgetType } from '../widgets';
import { isGridItem, type WidgetItem, type WidgetSettings } from './items';

const json = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

// 每个旧键：搬到哪种小组件、怎么变成 settings（校验不过就不要了）
const MOVES: [string, WidgetType, (text: string) => WidgetSettings | null][] = [
  [LEGACY_KEYS.notes, 'notes', (t) => ((v) => (Array.isArray(v) && v.every(isNote) && v.length ? { notes: v } : null))(json(t))],
  [LEGACY_KEYS.weatherPlace, 'weather', (t) => ((v) => (isPlace(v) ? { place: v } : null))(json(t))],
  [LEGACY_KEYS.bookmarkFolder, 'bookmarks', (t) => ({ folder: t })],
  [LEGACY_KEYS.historyTab, 'history', (t) => (HISTORY_TABS.includes(t as HistoryTab) ? { tab: t as HistoryTab } : null)],
];

export function migrateWidgetData() {
  const found = MOVES.flatMap(([key, type, toSettings]) => {
    const text = localStorage.getItem(key);
    return text === null ? [] : [{ key, type, settings: toSettings(text) }];
  });
  if (!found.length) return;
  const grid = readList(KEYS.grid, isGridItem, DEFAULT_ITEMS);
  for (const { key, type, settings } of found) {
    let target = grid.find((item): item is WidgetItem => item.kind === 'widget' && item.type === type);
    if (!target && type === 'notes' && settings) {
      target = { id: crypto.randomUUID(), kind: 'widget', type, size: 'm' };
      grid.push(target);
    }
    if (target && settings) target.settings = { ...target.settings, ...settings };
    localStorage.removeItem(key);
  }
  writeJson(KEYS.grid, grid);
}

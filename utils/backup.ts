// 备份与恢复：把布局、图标、便签、庭的天数和偏好打包成一个 JSON 文件，在另一个浏览器里导入。
// 导入是整体替换，不和现有数据合并；文件校验不过就整个拒绝，不只导入一部分。
// 日历订阅地址相当于密码，只有用户勾选时才导出；备份里没有日历时，导入后保留原来的日历。
import { DEFAULT_ITEMS } from '../config';
import { isCalendarSource, type CalendarSource } from './calendar/ical';
import { AppError } from './errors';
import { isGridItem, isPoint, type GridItem, type Point } from './grid/items';
import { isIconStore, type IconStore } from './icons/model';
import { isNote, type Note } from './notes';
import { KEYS, readJson, readList, writeJson } from './storage';
import { isThemeChoice, readThemeChoice, type ThemeChoice } from './theme';
import { isVisits, type Visits } from './visits';
import { isPlace, type Place } from './weather';

/** 备份格式的版本。改了 BackupData 的结构就加一，并在 parseBackup 里把旧版本迁移过来。 */
const VERSION = 2;

export type BackupData = {
  grid: GridItem[];
  /** 「添加」格子的位置 */
  addTile: Point | null;
  icons: IconStore;
  notes: Note[];
  visits: Visits | null;
  engine: string | null;
  theme: ThemeChoice;
  /** 天气小组件选的城市（第 2 版起） */
  weather: Place | null;
  calendars?: CalendarSource[];
};

export type Backup = { app: 'niwa'; version: number; exportedAt: string; data: BackupData };

export function createBackup(includeCalendars: boolean): Backup {
  const data: BackupData = {
    grid: readList(KEYS.grid, isGridItem, DEFAULT_ITEMS),
    addTile: readJson(KEYS.addTile, isPoint),
    icons: readJson(KEYS.icons, isIconStore) ?? {},
    notes: readList(KEYS.notes, isNote, []),
    visits: readJson(KEYS.visits, isVisits),
    engine: localStorage.getItem(KEYS.engine),
    theme: readThemeChoice(),
    weather: readJson(KEYS.weather, isPlace),
  };
  if (includeCalendars) data.calendars = readList(KEYS.calendars, isCalendarSource, []);
  return { app: 'niwa', version: VERSION, exportedAt: new Date().toISOString(), data };
}

/** 整份数据哪里不对；没问题返回 null。 */
function findProblem(d: BackupData): string | null {
  if (!Array.isArray(d.grid) || !d.grid.every(isGridItem)) return '快捷方式或小组件的数据不对';
  const ids = d.grid.map((item) => item.id);
  if (new Set(ids).size !== ids.length) return '有重复的格子';
  const types = d.grid.flatMap((item) => (item.kind === 'widget' ? [item.type] : []));
  if (new Set(types).size !== types.length) return '同一种小组件有多个';
  if (d.addTile !== null && !isPoint(d.addTile)) return '「添加」的位置不对';
  if (!isIconStore(d.icons)) return '图标的数据不对';
  if (d.grid.some((item) => item.kind === 'link' && item.icon?.kind === 'image' && !d.icons[item.id])) return '缺少图标图片';
  if (!Array.isArray(d.notes) || !d.notes.every(isNote)) return '便签的数据不对';
  if (d.visits !== null && !isVisits(d.visits)) return '庭的数据不对';
  if (d.engine !== null && typeof d.engine !== 'string') return '搜索引擎的设置不对';
  if (!isThemeChoice(d.theme)) return '浅色 / 深色的设置不对';
  if (d.weather !== null && !isPlace(d.weather)) return '天气的城市不对';
  if (d.calendars !== undefined && !(Array.isArray(d.calendars) && d.calendars.every(isCalendarSource))) return '日历的数据不对';
  return null;
}

/** 读备份文件的内容并校验；不是备份、来自更新的版本或数据不对时抛 AppError。 */
export function parseBackup(text: string): Backup {
  let backup: Backup;
  try {
    backup = JSON.parse(text);
  } catch (cause) {
    throw new AppError('这不是 Niwa 的备份文件', { cause });
  }
  if (backup?.app !== 'niwa' || typeof backup.version !== 'number' || typeof backup.data !== 'object' || backup.data === null) {
    throw new AppError('这不是 Niwa 的备份文件');
  }
  if (backup.version > VERSION) throw new AppError('这个备份来自更新版本的 Niwa，请先更新再导入');
  // 第 1 版还没有天气。
  if (backup.version < 2) backup.data.weather = null;
  const problem = findProblem(backup.data);
  if (problem) throw new AppError(`备份文件有问题：${problem}。没有导入任何数据`);
  return backup;
}

/** 用备份替换现在的数据。写完要重新加载页面。 */
export function restoreBackup({ data }: Backup) {
  // 图片最大，先写：存不下时在这一步就失败，别的数据还没动。
  writeJson(KEYS.icons, data.icons);
  writeJson(KEYS.grid, data.grid);
  if (data.addTile) writeJson(KEYS.addTile, data.addTile);
  else localStorage.removeItem(KEYS.addTile);
  writeJson(KEYS.notes, data.notes);
  if (data.visits) writeJson(KEYS.visits, data.visits);
  else localStorage.removeItem(KEYS.visits);
  if (data.engine) localStorage.setItem(KEYS.engine, data.engine);
  else localStorage.removeItem(KEYS.engine);
  localStorage.setItem(KEYS.theme, data.theme);
  if (data.weather) writeJson(KEYS.weather, data.weather);
  else localStorage.removeItem(KEYS.weather);
  localStorage.removeItem(KEYS.weatherCache);
  if (data.calendars) {
    writeJson(KEYS.calendars, data.calendars);
    localStorage.removeItem(KEYS.calendarCache);
  }
}

// 备份与恢复：把布局（含每个小组件自己的设置和数据，比如便签）、图标、庭的天数和偏好打包成一个 JSON 文件，在另一个浏览器里导入。
// 导入是整体替换，不和现有数据合并；文件校验不过就整个拒绝，不只导入一部分。
// 私密信息（日历订阅地址、天气 KEY、联想排除的网站，见 SECRETS）相当于密码，只有用户勾选时才导出；备份里没有的那几项，导入后保留这边原来的。
import { DEFAULT_ITEMS } from '../config';
import { isCalendarSource } from './calendar/ical';
import { AppError } from './errors';
import { isGridItem, isPoint, type GridItem, type Point, type WidgetItem } from './grid/items';
import { isIconStore, type IconStore } from './icons/model';
import { KEYS, readJson, readList, writeJson, type StorageKey } from './storage';
import { isThemeChoice, readThemeChoice, type ThemeChoice } from './theme';
import { isVisits, type Visits } from './visits';
import { isWeatherAccount, type Place } from './weather';

/** 备份格式的版本。改了 BackupData 的结构就加一，并在 parseBackup 里把旧版本迁移过来。 */
const VERSION = 5;

/** cache：替换后要清掉的缓存 */
type Secret = { key: StorageKey; label: string; isValid: (v: unknown) => boolean; cache?: StorageKey };

/**
 * 私密的数据：相当于密码，所有私密数据都在这里登记，备份时统一处理——只有用户勾选时才导出，
 * 导入时备份里有哪项就替换哪项（并清掉它的缓存），没有的保留这边原来的。排除的网站也算：列表本身会暴露不想被看到的网站。
 */
const SECRETS: Record<'calendars' | 'weatherAccount' | 'searchExclude', Secret> = {
  calendars: {
    key: KEYS.calendars,
    label: '日历订阅地址',
    isValid: (v) => Array.isArray(v) && v.length > 0 && v.every(isCalendarSource),
    cache: KEYS.calendarCache,
  },
  weatherAccount: { key: KEYS.weatherAccount, label: '天气 KEY', isValid: isWeatherAccount, cache: KEYS.weatherCache },
  searchExclude: {
    key: KEYS.searchExclude,
    label: '联想排除的网站',
    isValid: (v) => Array.isArray(v) && v.length > 0 && v.every((s) => typeof s === 'string'),
  },
};
type SecretName = keyof typeof SECRETS;

/** 所有私密数据的名称，导出时的勾选项用 */
export const SECRET_LABELS = Object.values(SECRETS).map((s) => s.label);

/** 备份里带了哪几项私密数据 */
export const secretsIn = (data: BackupData) => Object.keys(data.secrets ?? {}).map((name) => SECRETS[name as SecretName].label);

export type BackupData = {
  grid: GridItem[];
  /** 「添加」格子的位置 */
  addTile: Point | null;
  icons: IconStore;
  visits: Visits | null;
  engine: string | null;
  theme: ThemeChoice;
  /** 勾选时才有的私密数据，按 SECRETS 的名称存（第 3 版起，第 4 版加了排除的网站；之前的版本只有日历，放在 data.calendars） */
  secrets?: Partial<Record<SecretName, unknown>>;
};

export type Backup = { app: 'niwa'; version: number; exportedAt: string; data: BackupData };

export function createBackup(includeSecrets: boolean): Backup {
  const data: BackupData = {
    grid: readList(KEYS.grid, isGridItem, DEFAULT_ITEMS),
    addTile: readJson(KEYS.addTile, isPoint),
    icons: readJson(KEYS.icons, isIconStore) ?? {},
    visits: readJson(KEYS.visits, isVisits),
    engine: localStorage.getItem(KEYS.engine),
    theme: readThemeChoice(),
  };
  if (includeSecrets) {
    // 这边没有的（没连日历、没填天气 KEY）不带，导入时就保留那边原来的。
    const entries = Object.entries(SECRETS).map(([name, s]) => [name, readJson(s.key, (v): v is unknown => s.isValid(v))]);
    data.secrets = Object.fromEntries(entries.filter(([, value]) => value !== null));
  }
  return { app: 'niwa', version: VERSION, exportedAt: new Date().toISOString(), data };
}

/** 整份数据哪里不对；没问题返回 null。 */
function findProblem(d: BackupData): string | null {
  if (!Array.isArray(d.grid) || !d.grid.every(isGridItem)) return '快捷方式或小组件的数据不对';
  const ids = d.grid.map((item) => item.id);
  if (new Set(ids).size !== ids.length) return '有重复的格子';
  if (d.addTile !== null && !isPoint(d.addTile)) return '「添加」的位置不对';
  if (!isIconStore(d.icons)) return '图标的数据不对';
  if (d.grid.some((item) => item.kind === 'link' && item.icon?.kind === 'image' && !d.icons[item.id])) return '缺少图标图片';
  if (d.visits !== null && !isVisits(d.visits)) return '庭的数据不对';
  if (d.engine !== null && typeof d.engine !== 'string') return '搜索引擎的设置不对';
  if (!isThemeChoice(d.theme)) return '浅色 / 深色的设置不对';
  if (d.secrets !== undefined) {
    if (typeof d.secrets !== 'object' || d.secrets === null) return '私密信息的数据不对';
    for (const [name, value] of Object.entries(d.secrets)) {
      const secret = SECRETS[name as SecretName] as Secret | undefined;
      if (!secret?.isValid(value)) return `${secret?.label ?? '私密信息'}的数据不对`;
    }
  }
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
  // 第 3 版之前私密数据只有日历，放在 data.calendars。
  if (backup.version < 3) {
    const old = backup.data as BackupData & { calendars?: unknown };
    if (old.calendars !== undefined) old.secrets = { calendars: old.calendars };
    delete old.calendars;
  }
  // 第 5 版之前每种小组件只能放一个，便签和天气的城市单独放在 data.notes、data.weather（第 2 版起）；
  // 现在放进网格里同一种的第一个小组件。没有便签小组件时补一个，便签不丢。
  if (backup.version < 5) {
    const old = backup.data as BackupData & { notes?: unknown; weather?: unknown };
    if (Array.isArray(old.grid)) {
      const first = (type: string) => old.grid.find((item) => item?.kind === 'widget' && item.type === type) as WidgetItem | undefined;
      if (Array.isArray(old.notes) && old.notes.length) {
        const notes = first('notes');
        if (notes) notes.settings = { ...notes.settings, notes: old.notes };
        else old.grid.push({ id: crypto.randomUUID(), kind: 'widget', type: 'notes', size: 'm', settings: { notes: old.notes } });
      }
      const weather = first('weather');
      if (old.weather && weather) weather.settings = { ...weather.settings, place: old.weather as Place };
    }
    delete old.notes;
    delete old.weather;
  }
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
  if (data.visits) writeJson(KEYS.visits, data.visits);
  else localStorage.removeItem(KEYS.visits);
  if (data.engine) localStorage.setItem(KEYS.engine, data.engine);
  else localStorage.removeItem(KEYS.engine);
  localStorage.setItem(KEYS.theme, data.theme);
  localStorage.removeItem(KEYS.weatherCache);
  for (const [name, value] of Object.entries(data.secrets ?? {})) {
    const secret = SECRETS[name as SecretName];
    writeJson(secret.key, value);
    if (secret.cache) localStorage.removeItem(secret.cache);
  }
}

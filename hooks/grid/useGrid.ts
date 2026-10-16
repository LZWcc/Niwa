import { DEFAULT_ITEMS } from '@/config';
import { isGridItem, type GridItem, type LinkItem, type WidgetItem, type WidgetSettings } from '@/utils/grid/items';
import type { Layout } from '@/utils/grid/layout';
import { isIconStore, type IconSpec, type IconStore, type LinkIcon } from '@/utils/icons/model';
import { KEYS, readJson } from '@/utils/storage';
import { clearTimerAlarm } from '@/utils/timer';
import { WIDGETS, type WidgetSize, type WidgetType } from '@/utils/widgets';
import { useStored, useStoredList } from '../useStored';

// 网格数据的增删改，存 niwa:grid；快捷方式的图标图片存 niwa:icons。
// 每一项长什么样在 utils/grid/items.ts，摆放规则在 utils/grid/layout.ts，界面在 components/grid/。

/** 对话框里编辑好的快捷方式 */
export type LinkDraft = { name: string; url: string; icon: IconSpec };

export function useGrid() {
  const [items, setItems] = useStoredList(KEYS.grid, isGridItem, DEFAULT_ITEMS);
  const [icons, setIcons] = useStored<IconStore>(KEYS.icons, () => readJson(KEYS.icons, isIconStore) ?? {});

  const patch = (id: string, change: Partial<LinkItem> | Partial<WidgetItem>) =>
    setItems((list) => list.map((item) => (item.id === id ? ({ ...item, ...change } as GridItem) : item)));

  /** 图片存进 niwa:icons（按快捷方式的 id），返回记在快捷方式上的图标；不是图片时删掉旧图片。 */
  const storeIcon = (id: string, icon: IconSpec | null): LinkIcon | undefined => {
    setIcons((all) => {
      const next = { ...all };
      if (icon?.kind === 'image') next[id] = icon.src;
      else delete next[id];
      return next;
    });
    return icon?.kind === 'image' ? { kind: 'image' } : (icon ?? undefined);
  };

  return {
    items,
    /** 显示用的图标：图片从 niwa:icons 里取，缺了就当没设置 */
    iconOf: (item: LinkItem): IconSpec | undefined =>
      item.icon?.kind === 'image' ? (icons[item.id] ? { kind: 'image', src: icons[item.id]! } : undefined) : item.icon,
    addLink: ({ name, url, icon }: LinkDraft, at: { x: number; y: number }) => {
      const id = crypto.randomUUID();
      const stored = storeIcon(id, icon);
      setItems((list) => [...list, { id, kind: 'link', name, url, icon: stored, ...at }]);
    },
    updateLink: (id: string, { name, url, icon }: LinkDraft) => patch(id, { name, url, icon: storeIcon(id, icon) }),
    addWidget: (type: WidgetType, at: { x: number; y: number }) =>
      setItems((list) => [...list, { id: crypto.randomUUID(), kind: 'widget', type, size: WIDGETS[type].defaultSize, ...at }]),
    /** 改小组件自己的设置和数据（便签的内容、天气的城市等）：按当前的设置算出要改的那几项，合并进去。 */
    configure: (id: string, change: (settings: WidgetSettings) => WidgetSettings) =>
      setItems((list) =>
        list.map((item) =>
          item.id === id && item.kind === 'widget' ? { ...item, settings: { ...item.settings, ...change(item.settings ?? {}) } } : item,
        ),
      ),
    /** 改尺寸（压到的格子怎么让由 useGridLayout 的 resized 算，再用 place 写回）。 */
    resize: (id: string, size: WidgetSize) => patch(id, { size }),
    remove: (id: string) => {
      if (icons[id]) storeIcon(id, null);
      // 计时器移除了，后台的闹钟也不要再响
      if (items.some((item) => item.id === id && item.kind === 'widget' && item.type === 'timer')) void clearTimerAlarm(id);
      setItems((list) => list.filter((item) => item.id !== id));
    },
    /** 按摆放结果写回每一项的 x、y（拖动、取消拖动、补上缺的位置）。 */
    place: (layout: Layout) =>
      setItems((list) =>
        list.map((item) => {
          const r = layout.get(item.id);
          return r && (r.x !== item.x || r.y !== item.y) ? { ...item, x: r.x, y: r.y } : item;
        }),
      ),
  };
}

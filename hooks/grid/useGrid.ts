import { DEFAULT_ITEMS } from '@/config';
import { isGridItem, type FolderItem, type GridItem, type LinkItem, type WidgetItem, type WidgetSettings } from '@/utils/grid/items';
import type { Layout } from '@/utils/grid/layout';
import { isIconStore, type IconSpec, type IconStore, type LinkIcon } from '@/utils/icons/model';
import { KEYS, readJson } from '@/utils/storage';
import { clearTimerAlarm } from '@/utils/timer';
import { WIDGETS, type WidgetSize, type WidgetType } from '@/utils/widgets';
import { useStored, useStoredList } from '../useStored';

// 网格数据的增删改，存 niwa:grid；快捷方式的图标图片存 niwa:icons。
// 每一项长什么样在 utils/grid/items.ts，摆放规则在 utils/grid/layout.ts，界面在 components/grid/。
// 快捷方式可以在网格上，也可以在收纳文件夹里：编辑、删除按 id 两处都找。

/** 对话框里编辑好的快捷方式 */
export type LinkDraft = { name: string; url: string; icon: IconSpec };

type Point = { x: number; y: number };

/** 放进文件夹的快捷方式不记位置 */
const unplaced = ({ id, kind, name, url, icon }: LinkItem): LinkItem => ({ id, kind, name, url, icon });

/** 文件夹里只剩一个时换回那个快捷方式，放在文件夹的位置 */
const settle = (folder: FolderItem): GridItem => (folder.links.length === 1 ? { ...folder.links[0]!, x: folder.x, y: folder.y } : folder);

/** 把 id 这个快捷方式从网格或文件夹里拿掉（文件夹只剩一个就换回快捷方式）；返回剩下的和拿出来的 */
function take(list: GridItem[], id: string): [GridItem[], LinkItem | undefined] {
  let found: LinkItem | undefined;
  const rest = list.flatMap((item): GridItem[] => {
    if (item.id === id && item.kind === 'link') {
      found = item;
      return [];
    }
    if (item.kind !== 'folder' || !item.links.some((l) => l.id === id)) return [item];
    found = item.links.find((l) => l.id === id);
    return [settle({ ...item, links: item.links.filter((l) => l.id !== id) })];
  });
  return [rest, found];
}

export function useGrid() {
  const [items, setItems] = useStoredList(KEYS.grid, isGridItem, DEFAULT_ITEMS);
  const [icons, setIcons] = useStored<IconStore>(KEYS.icons, () => readJson(KEYS.icons, isIconStore) ?? {});

  const patch = (id: string, change: Partial<LinkItem> | Partial<WidgetItem> | Partial<FolderItem>) =>
    setItems((list) =>
      list.map((item) => {
        if (item.id === id) return { ...item, ...change } as GridItem;
        // 文件夹里的快捷方式
        if (item.kind === 'folder' && item.links.some((l) => l.id === id)) {
          return { ...item, links: item.links.map((l) => (l.id === id ? { ...l, ...(change as Partial<LinkItem>) } : l)) };
        }
        return item;
      }),
    );

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
    addLink: ({ name, url, icon }: LinkDraft, at: Point) => {
      const id = crypto.randomUUID();
      const stored = storeIcon(id, icon);
      setItems((list) => [...list, { id, kind: 'link', name, url, icon: stored, ...at }]);
    },
    updateLink: (id: string, { name, url, icon }: LinkDraft) => patch(id, { name, url, icon: storeIcon(id, icon) }),
    addWidget: (type: WidgetType, at: Point) =>
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
    /** 删掉一格，或文件夹里的一个快捷方式（文件夹只剩一个时换回快捷方式） */
    remove: (id: string) => {
      if (icons[id]) storeIcon(id, null);
      // 计时器移除了，后台的闹钟也不要再响
      if (items.some((item) => item.id === id && item.kind === 'widget' && item.type === 'timer')) void clearTimerAlarm(id);
      setItems((list) => (list.some((item) => item.id === id) ? list.filter((item) => item.id !== id) : take(list, id)[0]));
    },
    /** 按摆放结果写回每一项的 x、y（拖动、取消拖动、补上缺的位置）。 */
    place: (layout: Layout) =>
      setItems((list) =>
        list.map((item) => {
          const r = layout.get(item.id);
          return r && (r.x !== item.x || r.y !== item.y) ? { ...item, x: r.x, y: r.y } : item;
        }),
      ),

    /**
     * 把快捷方式 id 放进 target：target 是文件夹就加到最后；是快捷方式就在它的位置新建文件夹，它在前、拖来的在后。
     * 返回新建的文件夹的 id（加进已有的文件夹时返回 null）。
     */
    merge: (id: string, target: string): string | null => {
      const folderId = crypto.randomUUID();
      const into = items.find((item) => item.id === target);
      setItems((list) => {
        const [rest, link] = take(list, id);
        if (!link) return list;
        return rest.map((item): GridItem => {
          if (item.id !== target) return item;
          if (item.kind === 'folder') return { ...item, links: [...item.links, unplaced(link)] };
          if (item.kind !== 'link') return item;
          return { id: folderId, kind: 'folder', name: '文件夹', links: [unplaced(item), unplaced(link)], x: item.x, y: item.y };
        });
      });
      return into?.kind === 'link' ? folderId : null;
    },
    /** 把文件夹里的快捷方式拿出来放到网格的 at（文件夹只剩一个时换回快捷方式） */
    moveOut: (id: string, at: Point) =>
      setItems((list) => {
        const [rest, link] = take(list, id);
        return link ? [...rest, { ...link, ...at }] : list;
      }),
    /** 文件夹里的新顺序 */
    reorder: (folderId: string, ids: string[]) =>
      setItems((list) =>
        list.map((item) =>
          item.id === folderId && item.kind === 'folder'
            ? { ...item, links: ids.flatMap((id) => item.links.find((l) => l.id === id) ?? []) }
            : item,
        ),
      ),
    renameFolder: (id: string, name: string) => patch(id, { name }),
    /** 解散文件夹：里面的快捷方式依次放到 spots（第一个就是文件夹的位置） */
    dissolve: (id: string, spots: Point[]) =>
      setItems((list) => {
        const folder = list.find((item): item is FolderItem => item.id === id && item.kind === 'folder');
        if (!folder) return list;
        return [...list.filter((item) => item.id !== id), ...folder.links.map((link, i) => ({ ...link, ...spots[i]! }))];
      }),
  };
}

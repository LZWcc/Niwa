import { useRef, useState, type CSSProperties } from 'react';
import type { Adding } from '@/components/page/AddButton';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { WIDGET_COMPONENTS } from '@/components/widgets';
import WidgetError from '@/components/widgets/WidgetError';
import { useFlip } from '@/hooks/grid/useFlip';
import { useGrid } from '@/hooks/grid/useGrid';
import { useGridDrag } from '@/hooks/grid/useGridDrag';
import { UNIT, useGridLayout } from '@/hooks/grid/useGridLayout';
import type { FolderItem, LinkItem } from '@/utils/grid/items';
import type { Layout, Rect } from '@/utils/grid/layout';
import { WIDGET_SIZES } from '@/utils/widgets';
import Folder from './Folder';
import FolderPanel from './FolderPanel';
import Shortcut from './Shortcut';
import ShortcutDialog from './ShortcutDialog';
import WidgetGallery from './WidgetGallery';

// 搜索框下方的网格：快捷方式和小组件自由摆放在一起。右上角「添加」菜单选的（adding）在这里打开对话框或小组件库。
// 数据 useGrid → 摆放 useGridLayout → 拖动 useGridDrag，增删改都经过 useFlip 的 animate 做动画。
// 快捷方式可以收进文件夹：拖到另一个快捷方式或文件夹正中停一下再松手（useGridDrag 的 onMerge），打开后在 FolderPanel 里管理。

/** 网格线从 1 开始 */
const area = (r: Rect): CSSProperties => ({ gridColumn: `${r.x + 1} / span ${r.w}`, gridRow: `${r.y + 1} / span ${r.h}` });

type Props = { now: Date; adding: Adding | null; onAddClose: () => void };

export default function Grid({ now, adding, onAddClose }: Props) {
  const {
    items,
    iconOf,
    addLink,
    updateLink,
    addWidget,
    configure,
    resize,
    remove,
    place,
    merge,
    moveOut,
    reorder,
    renameFolder,
    dissolve,
  } = useGrid();
  // 正在编辑的快捷方式；新建时是 adding === 'link'
  const [editing, setEditing] = useState<LinkItem>();
  const closeDialog = () => {
    setEditing(undefined);
    onAddClose();
  };
  // 打开的文件夹；fresh：刚合成的，一打开就改名字
  const [opened, setOpened] = useState<{ id: string; fresh: boolean } | null>(null);
  const folderOf = (linkId: string) => items.find((i): i is FolderItem => i.kind === 'folder' && i.links.some((l) => l.id === linkId));

  const gridRef = useRef<HTMLElement>(null);
  const animate = useFlip(gridRef);
  // 拖动钩子要先调用（摆放需要知道是否在拖），它在拖动时通过 view 读取下面算好的摆放。
  const view = useRef<{ layout: Layout; cols: number; place: (layout: Layout) => void }>(null);
  const { dragId, start } = useGridDrag(gridRef, {
    layout: () => view.current!.layout,
    cols: () => view.current!.cols,
    place: (next) => view.current!.place(next),
    animate,
    mergeable: (id, target) => byId.get(id)?.kind === 'link' && ['link', 'folder'].includes(byId.get(target)?.kind ?? ''),
    onMerge: (id, target) =>
      animate(() => {
        const created = merge(id, target);
        if (created) setOpened({ id: created, fresh: true });
      }),
  });
  const { cols, layout, spotForNew, spotAfter, spotAt, resized } = useGridLayout(gridRef, {
    items,
    place,
    dragging: dragId !== null,
  });
  const folder = items.find((i): i is FolderItem => i.kind === 'folder' && i.id === opened?.id) ?? null;
  const holder = editing ? folderOf(editing.id) : undefined;
  view.current = { layout, cols, place };

  // 页面打开期间不移动 DOM 节点：已有的格子留在原处，新加的接在后面，位置全靠 grid-column / grid-row。
  // 移动节点会让浏览器重建它的合成层，毛玻璃（backdrop-filter）那一帧会闪一下。
  const ids = items.map((i) => i.id);
  const domOrder = useRef<string[]>([]);
  domOrder.current = [...domOrder.current.filter((id) => ids.includes(id)), ...ids.filter((id) => !domOrder.current.includes(id))];
  const byId = new Map(items.map((i) => [i.id, i]));
  // 每种小组件里最靠左上的那个（先比行再比列）
  const first = new Set<string>();
  const seen = new Set<string>();
  for (const item of items
    .filter((i) => i.kind === 'widget')
    .sort((a, b) => layout.get(a.id)!.y - layout.get(b.id)!.y || layout.get(a.id)!.x - layout.get(b.id)!.x)) {
    if (item.kind === 'widget' && !seen.has(item.type)) {
      seen.add(item.type);
      first.add(item.id);
    }
  }

  return (
    <>
      <nav
        ref={gridRef}
        className={dragId ? 'grid is-reordering' : 'grid'}
        style={{ gridTemplateColumns: `repeat(${cols}, ${UNIT}px)` }}
        aria-label="快捷方式与小组件"
      >
        {domOrder.current.map((id) => {
          const item = byId.get(id)!;
          const style = area(layout.get(id)!);
          if (item.kind === 'link') {
            return (
              <Shortcut key={id} item={item} icon={iconOf(item)} style={style} lifted={dragId === id} onEdit={() => setEditing(item)} />
            );
          }
          if (item.kind === 'folder') {
            return (
              <Folder
                key={id}
                item={item}
                iconOf={iconOf}
                style={style}
                lifted={dragId === id}
                onOpen={() => setOpened({ id, fresh: false })}
              />
            );
          }
          const Widget = WIDGET_COMPONENTS[item.type];
          const frame = {
            style,
            lifted: dragId === id,
            onResize: (size: typeof item.size) => {
              const next = resized(id, size);
              animate(() => {
                resize(id, size);
                place(next);
              });
            },
            onRemove: () => animate(() => remove(id)),
          };
          return (
            <ErrorBoundary key={id} fallback={(retry) => <WidgetError widget={item} frame={frame} onRetry={retry} />}>
              <Widget
                widget={item}
                frame={frame}
                now={now}
                settings={item.settings ?? {}}
                onSettings={(change) => configure(id, change)}
                first={first.has(id)}
              />
            </ErrorBoundary>
          );
        })}
      </nav>

      <ShortcutDialog
        target={editing ?? (adding === 'link' ? null : undefined)}
        icon={editing ? iconOf(editing) : undefined}
        onSave={(link) => {
          if (editing) updateLink(editing.id, link);
          else animate(() => addLink(link, spotForNew({ w: 1, h: 1 })));
          closeDialog();
        }}
        onDelete={() => {
          if (editing) animate(() => remove(editing.id));
          closeDialog();
        }}
        onMoveOut={
          holder &&
          (() => {
            animate(() => moveOut(editing!.id, spotAfter(layout.get(holder.id)!)));
            closeDialog();
          })
        }
        onClose={closeDialog}
      />

      <WidgetGallery
        open={adding === 'widget'}
        now={now}
        onAdd={(type, size) => {
          animate(() => addWidget(type, size, spotForNew(WIDGET_SIZES[size])));
          onAddClose();
        }}
        onDragOut={(type, size, x, y, grab) => {
          // 放到指针下的位置、关上小组件库，网格接着拖
          let id = '';
          animate(() => {
            id = addWidget(type, size, spotAt(x - grab.x, y - grab.y, WIDGET_SIZES[size]));
            onAddClose();
          });
          start(id, x, y, grab);
        }}
        onClose={onAddClose}
      />

      <FolderPanel
        folder={folder}
        fresh={!!opened?.fresh}
        iconOf={iconOf}
        onRename={(name) => folder && renameFolder(folder.id, name)}
        onReorder={(ids) => folder && reorder(folder.id, ids)}
        onEdit={setEditing}
        onDragOut={(id, x, y) => {
          // 放到指针下的格子、关上文件夹，网格接着拖
          animate(() => {
            moveOut(id, spotAt(x, y));
            setOpened(null);
          });
          start(id, x, y);
        }}
        onDissolve={() => {
          if (!folder) return;
          // 第一个放在文件夹的位置，其余的依次往后放进空格子
          const at = layout.get(folder.id)!;
          const spots = [{ x: at.x, y: at.y }];
          for (let i = 1; i < folder.links.length; i++) spots.push(spotAfter(at, spots.slice(1)));
          animate(() => {
            dissolve(folder.id, spots);
            setOpened(null);
          });
        }}
        onClose={() => setOpened(null)}
      />
    </>
  );
}

import { useRef, useState, type CSSProperties } from 'react';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { WIDGET_COMPONENTS } from '@/components/widgets';
import WidgetError from '@/components/widgets/WidgetError';
import { useFlip } from '@/hooks/grid/useFlip';
import { useGrid } from '@/hooks/grid/useGrid';
import { useGridDrag } from '@/hooks/grid/useGridDrag';
import { UNIT, useGridLayout } from '@/hooks/grid/useGridLayout';
import type { LinkItem } from '@/utils/grid/items';
import type { Layout, Rect } from '@/utils/grid/layout';
import { WIDGETS, WIDGET_SIZES } from '@/utils/widgets';
import AddTile from './AddTile';
import Shortcut from './Shortcut';
import ShortcutDialog from './ShortcutDialog';

// 搜索框下方的网格：快捷方式、小组件和「添加」自由摆放在一起。
// 数据 useGrid → 摆放 useGridLayout → 拖动 useGridDrag，增删改都经过 useFlip 的 animate 做动画。

/** 网格线从 1 开始 */
const area = (r: Rect): CSSProperties => ({ gridColumn: `${r.x + 1} / span ${r.w}`, gridRow: `${r.y + 1} / span ${r.h}` });

export default function Grid({ now }: { now: Date }) {
  const { items, iconOf, addLink, updateLink, addWidget, configure, resize, remove, place } = useGrid();
  // undefined：对话框关闭；null：新建；对象：编辑
  const [editing, setEditing] = useState<LinkItem | null | undefined>(undefined);
  const closeDialog = () => setEditing(undefined);

  const gridRef = useRef<HTMLElement>(null);
  const animate = useFlip(gridRef);
  // 拖动钩子要先调用（摆放需要知道是否在拖），它在拖动时通过 view 读取下面算好的摆放。
  const view = useRef<{ layout: Layout; cols: number; apply: (layout: Layout) => void }>(null);
  const dragId = useGridDrag(gridRef, {
    layout: () => view.current!.layout,
    cols: () => view.current!.cols,
    place: (next) => view.current!.apply(next),
    animate,
  });
  const { cols, layout, apply, spotForNew, resized } = useGridLayout(gridRef, { items, place, dragging: dragId !== null });
  view.current = { layout, cols, apply };

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
          const Widget = WIDGET_COMPONENTS[item.type];
          const frame = {
            style,
            lifted: dragId === id,
            onResize: (size: typeof item.size) => {
              const next = resized(id, size);
              animate(() => {
                resize(id, size);
                apply(next);
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
        <AddTile
          style={area(layout.get('add')!)}
          lifted={dragId === 'add'}
          onAddLink={() => setEditing(null)}
          onAddWidget={(type) => animate(() => addWidget(type, spotForNew(WIDGET_SIZES[WIDGETS[type].defaultSize])))}
        />
      </nav>

      <ShortcutDialog
        target={editing}
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
        onClose={closeDialog}
      />
    </>
  );
}

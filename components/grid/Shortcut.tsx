import type { LinkItem } from '@/utils/grid/items';
import type { IconSpec } from '@/utils/icons/model';
import ShortcutIcon from './ShortcutIcon';

type Props = { item: LinkItem; icon?: IconSpec; style: React.CSSProperties; lifted: boolean; onEdit: () => void };

// 拖动由网格统一处理（useGridDrag），这里只标记 data-key；右键打开编辑（键盘：聚焦后按菜单键或 Shift+F10），和小组件的菜单一样。
export default function Shortcut({ item, icon, style, lifted, onEdit }: Props) {
  return (
    <div
      className={lifted ? 'shortcut is-lifted' : 'shortcut'}
      data-key={item.id}
      style={style}
      onContextMenu={(e) => {
        e.preventDefault();
        onEdit();
      }}
    >
      <a className="shortcut-link" href={item.url} draggable={false} title={item.url}>
        <ShortcutIcon name={item.name} url={item.url} icon={icon} />
        <span className="shortcut-name">{item.name}</span>
      </a>
    </div>
  );
}

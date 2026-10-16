import type { LinkItem } from '@/utils/grid/items';
import type { IconSpec } from '@/utils/icons/model';
import ShortcutIcon from './ShortcutIcon';

type Props = { item: LinkItem; icon?: IconSpec; style: React.CSSProperties; lifted: boolean; onEdit: () => void };

// 拖动由网格统一处理（useGridDrag），这里只标记 data-key；右键或“…”打开编辑。
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
      <button type="button" className="shortcut-edit" onClick={onEdit} aria-label={`编辑 ${item.name}`}>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <circle cx="2" cy="5" r="1" />
          <circle cx="5" cy="5" r="1" />
          <circle cx="8" cy="5" r="1" />
        </svg>
      </button>
    </div>
  );
}

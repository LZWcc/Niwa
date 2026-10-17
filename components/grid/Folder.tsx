import type { FolderItem, LinkItem } from '@/utils/grid/items';
import type { IconSpec } from '@/utils/icons/model';
import ShortcutIcon from './ShortcutIcon';

type Props = {
  item: FolderItem;
  iconOf: (link: LinkItem) => IconSpec | undefined;
  style: React.CSSProperties;
  lifted: boolean;
  onOpen: () => void;
};

// 网格上的收纳文件夹：和快捷方式一样大，图标里是前四个的缩略图。点一下或右键打开；拖动由网格统一处理（useGridDrag）。
export default function Folder({ item, iconOf, style, lifted, onOpen }: Props) {
  return (
    <div
      className={lifted ? 'shortcut is-folder is-lifted' : 'shortcut is-folder'}
      data-key={item.id}
      style={style}
      onContextMenu={(e) => {
        e.preventDefault();
        onOpen();
      }}
    >
      <button type="button" className="shortcut-link" onClick={onOpen} aria-label={`文件夹 ${item.name}，${item.links.length} 个快捷方式`}>
        <span className="shortcut-icon folder-icon" aria-hidden="true">
          {item.links.slice(0, 4).map((link) => (
            <ShortcutIcon key={link.id} name={link.name} url={link.url} icon={iconOf(link)} />
          ))}
        </span>
        <span className="shortcut-name">{item.name}</span>
      </button>
    </div>
  );
}

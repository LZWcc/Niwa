import { useRef, useState } from 'react';
import Dialog from '@/components/common/Dialog';
import { useFlip } from '@/hooks/grid/useFlip';
import { useFolderDrag } from '@/hooks/grid/useFolderDrag';
import type { FolderItem, LinkItem } from '@/utils/grid/items';
import type { IconSpec } from '@/utils/icons/model';
import Shortcut from './Shortcut';

type Props = {
  /** 打开的文件夹；null：关着 */
  folder: FolderItem | null;
  /** 刚合成的：一打开就选中名字，直接打字改 */
  fresh: boolean;
  iconOf: (link: LinkItem) => IconSpec | undefined;
  onRename: (name: string) => void;
  onReorder: (ids: string[]) => void;
  onEdit: (link: LinkItem) => void;
  /** 拖出了面板：网格接着拖，指针在 (x, y) */
  onDragOut: (id: string, x: number, y: number) => void;
  onDissolve: () => void;
  onClose: () => void;
};

// 打开的收纳文件夹（参照 Launchpad）：上面是名字（点一下就能改），下面是里面的快捷方式，点了照常打开网站、右键编辑；
// 在里面拖动换顺序，拖出面板就放回网格。点外面、按 Esc 关上。

const MAX_COLS = 5;

export default function FolderPanel({ folder, fresh, iconOf, onRename, onReorder, onEdit, onDragOut, onDissolve, onClose }: Props) {
  const [name, setName] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const animate = useFlip(gridRef);
  const links = folder?.links ?? [];
  const cols = Math.min(MAX_COLS, Math.max(3, links.length));
  const dragId = useFolderDrag(gridRef, panelRef, {
    ids: () => links.map((l) => l.id),
    cols: () => cols,
    reorder: onReorder,
    animate,
    onDragOut,
  });

  // 名字改完（失焦、回车、关上时）才存；空的不算
  const commit = () => {
    const next = name.trim();
    if (folder && next && next !== folder.name) onRename(next);
  };

  return (
    <Dialog
      open={!!folder}
      onClose={() => {
        commit();
        onClose();
      }}
      className="dialog folder-dialog"
      labelledBy="folder-name"
      onOpen={(el) => {
        setName(folder?.name ?? '');
        const input = el.querySelector<HTMLInputElement>('.folder-name')!;
        // 等名字填进输入框再选中（这时 state 还没更新，输入框是空的）
        if (fresh)
          setTimeout(() => {
            input.focus();
            input.select();
          });
        else el.querySelector<HTMLElement>('.folder-panel')?.focus();
      }}
    >
      <div className="folder-panel" ref={panelRef} tabIndex={-1}>
        <input
          id="folder-name"
          className="folder-name"
          value={name}
          aria-label="文件夹名称"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
        />
        <div className="folder-grid" ref={gridRef} style={{ gridTemplateColumns: `repeat(${cols}, 80px)` }}>
          {links.map((link) => (
            <Shortcut key={link.id} item={link} icon={iconOf(link)} style={{}} lifted={dragId === link.id} onEdit={() => onEdit(link)} />
          ))}
        </div>
        <footer className="folder-foot">
          <span>拖出去就放回桌面</span>
          <button type="button" className="btn" onClick={onDissolve}>
            解散文件夹
          </button>
        </footer>
      </div>
    </Dialog>
  );
}

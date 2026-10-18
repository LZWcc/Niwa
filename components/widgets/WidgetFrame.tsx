import { useCallback, useRef, useState, type ReactNode } from 'react';
import Popover from '@/components/common/Popover';
import type { WidgetItem } from '@/utils/grid/items';
import { SIZE_NAMES, SIZE_ORDER } from '@/utils/widgets';
import type { FrameProps } from './types';

type Props = {
  widget: WidgetItem;
  frame: FrameProps;
  /** 菜单里额外的项，例如日程的“管理日历…”；点了会自动关闭菜单 */
  menu?: ReactNode;
  /** 移除时会一起删掉的东西（例如“5 条便签”）：有的话，“移除小组件”要点两次 */
  losing?: string;
  children: ReactNode;
};

// 链接、输入框上保留浏览器自己的右键菜单（在新标签页打开、复制粘贴）
const NATIVE = 'a[href], input, textarea, select, [contenteditable]';

// 所有小组件共用的外框：毛玻璃卡片、右键菜单（尺寸、额外项、移除），菜单出现在指针的位置。
// 从空白处按住就能拖动（由网格的 useGridDrag 处理）；输入框、按钮上不会触发。
export default function WidgetFrame({ widget, frame, menu, losing, children }: Props) {
  const { style, lifted, onResize, onRemove } = frame;
  // 菜单出现在哪（右键的位置）；null：关着
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
  const self = useRef<HTMLDivElement>(null);
  // 第一次点“移除小组件”时先问一句；关掉菜单就算了
  const [confirming, setConfirming] = useState(false);
  const closeMenu = useCallback(() => {
    setMenuAt(null);
    setConfirming(false);
  }, []);

  return (
    <div
      ref={self}
      className={`widget size-${widget.size}${lifted ? ' is-lifted' : ''}`}
      data-type={widget.type}
      data-key={widget.id}
      style={style}
      onContextMenu={(e) => {
        // 卡片里弹出的菜单、对话框挂在别处（portal），右键事件也会冒泡上来，不算
        const target = e.target as Element;
        if (!e.currentTarget.contains(target) || target.closest(NATIVE) || target.closest('dialog')) return;
        e.preventDefault();
        setConfirming(false);
        // 键盘（菜单键、Shift+F10）打开时没有指针位置，放在卡片右上角
        const box = e.currentTarget.getBoundingClientRect();
        setMenuAt(e.clientX || e.clientY ? { x: e.clientX, y: e.clientY } : { x: box.right - 12, y: box.top + 12 });
      }}
    >
      {children}
      {menuAt && (
        <Popover anchor={self.current} placement={menuAt} onClose={closeMenu} role="menu" label="小组件设置" className="widget-menu">
          <div
            className="segmented"
            role="group"
            aria-label="尺寸"
            style={{ '--i': SIZE_ORDER.indexOf(widget.size) } as React.CSSProperties}
          >
            {SIZE_ORDER.map((size) => (
              <button key={size} type="button" role="menuitemradio" aria-checked={widget.size === size} onClick={() => onResize(size)}>
                {SIZE_NAMES[size]}
              </button>
            ))}
          </div>
          {menu && <div onClick={closeMenu}>{menu}</div>}
          <button
            type="button"
            role="menuitem"
            className={confirming ? 'menu-item is-danger is-confirming' : 'menu-item is-danger'}
            onClick={losing && !confirming ? () => setConfirming(true) : onRemove}
          >
            {confirming ? `再点一次，连同${losing}一起删掉` : '移除小组件'}
          </button>
        </Popover>
      )}
    </div>
  );
}

import { useCallback, useRef, useState, type ReactNode } from 'react';
import Popover from '@/components/common/Popover';
import type { WidgetItem } from '@/utils/grid/items';
import { SIZE_NAMES, SIZE_ORDER, WIDGETS } from '@/utils/widgets';
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

// 所有小组件共用的外框：毛玻璃卡片、右上角的“…”菜单（尺寸、额外项、移除）。
// 从空白处按住就能拖动（由网格的 useGridDrag 处理）；输入框、按钮上不会触发。
export default function WidgetFrame({ widget, frame, menu, losing, children }: Props) {
  const { style, lifted, onResize, onRemove } = frame;
  const [menuOpen, setMenuOpen] = useState(false);
  const more = useRef<HTMLButtonElement>(null);
  // 第一次点“移除小组件”时先问一句；关掉菜单就算了
  const [confirming, setConfirming] = useState(false);
  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setConfirming(false);
  }, []);

  return (
    <div
      className={`widget size-${widget.size}${lifted ? ' is-lifted' : ''}${menuOpen ? ' has-menu' : ''}`}
      data-type={widget.type}
      data-key={widget.id}
      style={style}
    >
      {children}
      <button
        ref={more}
        type="button"
        className="widget-more"
        aria-label={`${WIDGETS[widget.type].name}小组件设置`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => (menuOpen ? closeMenu() : setMenuOpen(true))}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <circle cx="2.5" cy="6" r="1.1" />
          <circle cx="6" cy="6" r="1.1" />
          <circle cx="9.5" cy="6" r="1.1" />
        </svg>
      </button>
      {menuOpen && (
        <Popover anchor={more.current} placement="bottom-end" onClose={closeMenu} role="menu" label="小组件设置" className="widget-menu">
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

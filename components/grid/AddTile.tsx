import { useCallback, useRef, useState, type CSSProperties } from 'react';
import Popover from '@/components/common/Popover';
import { WIDGETS, WIDGET_TYPES, type WidgetType } from '@/utils/widgets';

type Props = {
  style: CSSProperties;
  lifted: boolean;
  /** 已经放在网格里的小组件（每种只能放一个） */
  present: WidgetType[];
  onAddLink: () => void;
  onAddWidget: (type: WidgetType) => void;
};

// 「添加」格子：点开菜单，加一个网站或一种小组件。它本身也能拖到别处。
export default function AddTile({ style, lifted, present, onAddLink, onAddWidget }: Props) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const pick = (action: () => void) => () => {
    action();
    setOpen(false);
  };

  return (
    <div className={lifted ? 'grid-add is-lifted' : 'grid-add'} data-key="add" style={style}>
      <button
        ref={button}
        type="button"
        className="shortcut-link shortcut-add"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="shortcut-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
        <span className="shortcut-name">添加</span>
      </button>
      {open && (
        <Popover anchor={button.current} placement="bottom-end" onClose={close} role="menu" label="添加" className="add-menu">
          <button type="button" role="menuitem" className="add-option" onClick={pick(onAddLink)}>
            <span className="picker-name">网站</span>
            <span className="picker-desc">添加一个快捷方式</span>
          </button>
          <p className="add-heading">小组件</p>
          {WIDGET_TYPES.map((type) => {
            const added = present.includes(type);
            return (
              <button
                key={type}
                type="button"
                role="menuitem"
                className="add-option"
                disabled={added}
                onClick={pick(() => onAddWidget(type))}
              >
                <span className="picker-name">{WIDGETS[type].name}</span>
                <span className="picker-desc">{added ? '已添加' : WIDGETS[type].desc}</span>
              </button>
            );
          })}
        </Popover>
      )}
    </div>
  );
}

import { useCallback, useRef, useState } from 'react';
import Popover from '@/components/common/Popover';

/** 「添加」菜单里选了什么：网站打开新建快捷方式的对话框，小组件打开小组件库 */
export type Adding = 'link' | 'widget';

// 右上角：点开菜单，加一个网站，或者打开小组件库挑一个小组件（同一种可以加多个）。新加的接在网格最后。
export default function AddButton({ onPick }: { onPick: (adding: Adding) => void }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const pick = (adding: Adding) => () => {
    onPick(adding);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        className="page-action"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="添加"
        title="添加"
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 2.5v11M2.5 8h11" />
        </svg>
      </button>
      {open && (
        <Popover anchor={button.current} placement="bottom-end" onClose={close} role="menu" label="添加" className="add-menu">
          <button type="button" role="menuitem" className="add-option" onClick={pick('link')}>
            <span className="picker-name">网站</span>
            <span className="picker-desc">添加一个快捷方式</span>
          </button>
          <button type="button" role="menuitem" className="add-option" onClick={pick('widget')}>
            <span className="picker-name">小组件</span>
            <span className="picker-desc">天气、日程、便签等，先预览再添加</span>
          </button>
        </Popover>
      )}
    </>
  );
}

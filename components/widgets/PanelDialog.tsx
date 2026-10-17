import { useId, type ReactNode } from 'react';
import Dialog from '@/components/common/Dialog';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** 标题右边：换来源、分组、搜索框这类 */
  tools?: ReactNode;
  /** 灰色的一行状态：更新时间、失败原因 */
  status?: string;
  /** 关闭按钮左边的按钮，例如立即刷新 */
  actions?: ReactNode;
  /** 加在对话框上，各个面板据此改尺寸和内容的排版 */
  className: string;
  /** 每次打开后调用：重置状态、把焦点放到搜索框；焦点默认在面板本身（不在第一个按钮上，否则一打开就有焦点框） */
  onOpen?: (dialog: HTMLDialogElement) => void;
  children: ReactNode;
};

// 小组件点标题打开的大面板：上面一行是标题、工具、状态和关闭，下面是能滚动的内容。热榜、历史、收藏夹、天气共用；月历自成一套。
export default function PanelDialog({ open, onClose, title, tools, status, actions, className, onOpen, children }: Props) {
  // 放了几个同一种小组件时页面上有几份这个对话框，id 不能重复
  const uid = useId();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      className={`dialog panel-dialog ${className}`}
      labelledBy={`${uid}-title`}
      onOpen={(el) => {
        el.querySelector<HTMLElement>('.panel')?.focus();
        onOpen?.(el);
      }}
    >
      <div className="panel" tabIndex={-1}>
        <header className="panel-head">
          <h2 id={`${uid}-title`}>{title}</h2>
          {tools}
          <span className="panel-status" title={status}>
            {status}
          </span>
          {actions}
          <button type="button" className="panel-button" onClick={onClose} aria-label={`关闭${title}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        {/* 关着时不渲染内容：收藏夹整棵树、几百条历史，没打开就不画 */}
        <div className="panel-body">{open && children}</div>
      </div>
    </Dialog>
  );
}

/** 面板标题栏里的“立即刷新” */
export function RefreshButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="panel-button" onClick={onClick} aria-label="立即刷新" title="立即刷新">
      <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
        <path
          d="M11 6.5A4.5 4.5 0 1 1 9.2 2.9M9.5 1v2.2H7.3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

import type { ReactNode } from 'react';

type Props = {
  title: string;
  meta?: ReactNode;
  /** 有的话，点标题这一行（别的按钮以外）打开大面板，标题后面带一个 › */
  onOpen?: () => void;
  children?: ReactNode;
};

// 所有小组件共用的标题栏：标题、一行灰色的元信息（条数、天数、所在文件夹），右侧放切换、搜索这类工具。
// 右边留出“…”按钮的位置。画面型的内容（庭、日程的日期）放在标题栏下面的 .widget-panel 里。
export default function WidgetHeader({ title, meta, onOpen, children }: Props) {
  return (
    <header
      className={onOpen ? 'widget-head is-openable' : 'widget-head'}
      // 点到这一行里别的按钮（右侧工具、收藏夹的“返回上一级”）不打开
      onClick={onOpen && ((e) => !(e.target as Element).closest('button:not(.widget-title-open), a, input') && onOpen())}
    >
      <h2 className="widget-title">
        {/* 标题做成按钮，键盘也能打开；点击冒泡到上面的 header 处理 */}
        {onOpen ? (
          <button type="button" className="widget-title-open">
            {title}
            <span aria-hidden="true">›</span>
          </button>
        ) : (
          title
        )}
      </h2>
      {meta && <span className="widget-meta">{meta}</span>}
      {children && <div className="widget-tools">{children}</div>}
    </header>
  );
}

import type { ReactNode } from 'react';

type Props = { title: string; meta?: ReactNode; children?: ReactNode };

// 所有小组件共用的标题栏：标题、一行灰色的元信息（条数、天数、所在文件夹），右侧放切换、搜索这类工具。
// 右边留出“…”按钮的位置。画面型的内容（庭、日程的日期）放在标题栏下面的 .widget-panel 里。
export default function WidgetHeader({ title, meta, children }: Props) {
  return (
    <header className="widget-head">
      <h2 className="widget-title">{title}</h2>
      {meta && <span className="widget-meta">{meta}</span>}
      {children && <div className="widget-tools">{children}</div>}
    </header>
  );
}

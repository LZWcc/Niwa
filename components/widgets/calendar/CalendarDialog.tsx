import { useId, useState } from 'react';
import Dialog from '@/components/common/Dialog';
import type { CalendarState } from '@/hooks/useCalendar';
import { CALENDAR } from '@/config';
import { isFileSource, normalizeCalendarUrl } from '@/utils/calendar/ical';
import { toUserMessage } from '@/utils/errors';
import { requestOrigins } from '@/utils/permissions';

// 管理日历：列出已连接的日历，粘贴 iCal 私密地址添加（可一次多个），或者导入 .ics 文件（拖进来或选择，可一次多个），移除。

/** dropped：拖到日程小组件上的文件，打开时直接导入 */
type Props = { open: boolean; calendar: CalendarState; dropped: File[] | null; onClose: () => void };

export default function CalendarDialog({ open, calendar, dropped, onClose }: Props) {
  // 放了几个这种小组件时页面上有几份这个对话框，id 不能重复
  const uid = useId();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [added, setAdded] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const { sources, setSources, importFiles, removeSource } = calendar;

  // 一次可以粘贴多个地址，一行一个（也接受空格、逗号分隔）。
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = text.split(/[\s,，]+/).filter(Boolean);
    const urls: string[] = [];
    const invalid: string[] = [];
    for (const line of lines) {
      const href = normalizeCalendarUrl(line);
      if (!href) invalid.push(line);
      else if (!sources.some((s) => s.url === href) && !urls.includes(href)) urls.push(href);
    }
    if (urls.length === 0) {
      setError(invalid.length ? `无法识别：${invalid.join('、')}` : '这些日历已经添加过了');
      return;
    }
    // 权限请求必须在点击里直接发起；多个日历合并成一次请求。
    requestOrigins([...new Set(urls.map((u) => `${new URL(u).origin}/*`))]).then(
      (granted) => {
        if (!granted) return setError('需要允许访问日历所在的网站，才能读取日历');
        const fresh = urls.map((url, i) => ({
          id: crypto.randomUUID(),
          url,
          name: '',
          color: CALENDAR.colors[(sources.length + i) % CALENDAR.colors.length]!,
        }));
        setSources((list) => [...list, ...fresh]);
        setAdded(fresh.map((s) => s.id));
        setText(invalid.join('\n'));
        setError(invalid.length ? `已添加 ${fresh.length} 个；这些无法识别：${invalid.join('、')}` : '');
      },
      (error) => setError(toUserMessage(error, '申请日历网站权限')),
    );
  };

  const importAll = (files: File[]) => {
    if (files.length === 0) return;
    setError('');
    void importFiles(files).then(({ imported, problems }) => {
      setAdded(imported);
      setError(problems.join('；'));
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="dialog dialog-wide"
      labelledBy={`${uid}-title`}
      onOpen={(el) => {
        setText('');
        setError('');
        setAdded([]);
        setDragging(false);
        // 光标直接在输入框里，而不是落在第一个“移除”按钮上。
        el.querySelector('textarea')?.focus();
        if (dropped) importAll(dropped);
      }}
    >
      <form className="dialog-body" onSubmit={add} noValidate>
        <h2 id={`${uid}-title`} className="dialog-title">
          管理日历
        </h2>

        {sources.length > 0 && (
          <section className="sources-block">
            <h3 className="sources-title">已连接 {sources.length} 个日历</h3>
            <ul className="sources">
              {sources.map((s) => (
                <li key={s.id}>
                  <span className="source-dot" style={{ background: s.color }} aria-hidden="true" />
                  <span className="source-name" title={isFileSource(s) ? '导入的文件，不会自动更新' : s.url}>
                    {s.name || <span className="source-pending">读取中…</span>}
                  </span>
                  {isFileSource(s) && <span className="source-kind">文件</span>}
                  {added.includes(s.id) && <span className="source-new">{isFileSource(s) ? '已导入' : '已添加'}</span>}
                  <button type="button" className="btn btn-danger" onClick={() => removeSource(s)}>
                    移除
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <ol className="steps">
          <li>
            打开{' '}
            <a href={CALENDAR.google.settings} target="_blank" rel="noreferrer">
              Google 日历设置
            </a>
            ，左侧选中一个日历
          </li>
          <li>在「集成日历」里复制「iCal 格式的私密地址」</li>
          <li>粘贴到下面；有多个日历就一行一个，一起添加</li>
        </ol>

        <label className="field">
          <span>{sources.length ? '添加更多日历' : '私密地址'}</span>
          <textarea
            className="field-area"
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'https://calendar.google.com/calendar/ical/…/basic.ics\n可以一行一个，粘贴多个'}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!!error}
            aria-describedby={error ? `${uid}-error` : `${uid}-note`}
          />
          {error ? (
            <span className="field-error" id={`${uid}-error`}>
              {error}
            </span>
          ) : (
            <span className="field-note" id={`${uid}-note`}>
              这些地址相当于密码，只保存在这台电脑上。也支持其他日历的 .ics 订阅地址。
            </span>
          )}
        </label>

        {/* 没有订阅地址的日历（课程表、节假日、从别的日历导出的）：导入 .ics 文件，是一份快照，不会自动更新 */}
        <div
          className={dragging ? 'file-drop is-dragging' : 'file-drop'}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes('Files')) return;
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            importAll([...e.dataTransfer.files]);
          }}
        >
          <span>
            或者把 .ics 文件拖到这里，
            <label className="file-drop-pick">
              选择文件
              <input
                type="file"
                accept=".ics,text/calendar"
                multiple
                hidden
                onChange={(e) => {
                  importAll([...(e.target.files ?? [])]);
                  e.target.value = '';
                }}
              />
            </label>
          </span>
          <span className="field-note">适合课程表、节假日这类很少变的日历。导入后不会自动更新，源文件变了就再导入一次，同名的会替换。</span>
        </div>

        <footer className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            完成
          </button>
          <button type="submit" className="btn btn-primary" disabled={!text.trim()}>
            添加
          </button>
        </footer>
      </form>
    </Dialog>
  );
}

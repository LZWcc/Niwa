import { useState } from 'react';
import Dialog from '@/components/common/Dialog';
import type { CalendarState } from '@/hooks/useCalendar';
import { CALENDAR } from '@/config';
import { normalizeCalendarUrl } from '@/utils/calendar/ical';
import { toUserMessage } from '@/utils/errors';
import { requestOrigins } from '@/utils/permissions';

// 管理日历：列出已连接的日历，粘贴 iCal 私密地址添加（可一次多个），移除。

type Props = { open: boolean; calendar: CalendarState; onClose: () => void };

export default function CalendarDialog({ open, calendar, onClose }: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [added, setAdded] = useState<string[]>([]);
  const { sources, setSources } = calendar;

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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="dialog dialog-wide"
      labelledBy="cal-dialog-title"
      onOpen={(el) => {
        setText('');
        setError('');
        setAdded([]);
        // 光标直接在输入框里，而不是落在第一个“移除”按钮上。
        el.querySelector('textarea')?.focus();
      }}
    >
      <form className="dialog-body" onSubmit={add} noValidate>
        <h2 id="cal-dialog-title" className="dialog-title">
          管理日历
        </h2>

        {sources.length > 0 && (
          <section className="sources-block">
            <h3 className="sources-title">已连接 {sources.length} 个日历</h3>
            <ul className="sources">
              {sources.map((s) => (
                <li key={s.id}>
                  <span className="source-dot" style={{ background: s.color }} aria-hidden="true" />
                  <span className="source-name" title={s.url}>
                    {s.name || <span className="source-pending">读取中…</span>}
                  </span>
                  {added.includes(s.id) && <span className="source-new">已添加</span>}
                  <button type="button" className="btn btn-danger" onClick={() => setSources((list) => list.filter((x) => x.id !== s.id))}>
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
            aria-describedby={error ? 'cal-url-error' : 'cal-url-note'}
          />
          {error ? (
            <span className="field-error" id="cal-url-error">
              {error}
            </span>
          ) : (
            <span className="field-note" id="cal-url-note">
              这些地址相当于密码，只保存在这台电脑上。也支持其他日历的 .ics 订阅地址。
            </span>
          )}
        </label>

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

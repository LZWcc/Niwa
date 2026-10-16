import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { Note } from '@/utils/notes';
import type { WidgetProps } from '../types';
import WidgetFrame from '../WidgetFrame';
import WidgetHeader from '../WidgetHeader';

// 便签：回车保存，点一条复制；焦点不在输入框时，在页面任意处粘贴也会存成一条（放了几个便签时存进最靠左上的那个）。
// 每个便签小组件是独立的一组，内容在自己的 settings.notes 里。

const isMac = /Mac|iPhone|iPad/.test(navigator.platform);

export default function NotesWidget({ widget, frame, settings, onSettings, first }: WidgetProps) {
  const { size } = widget;
  const notes = settings.notes ?? [];
  const setNotes = useCallback((change: (list: Note[]) => Note[]) => onSettings((s) => ({ notes: change(s.notes ?? []) })), [onSettings]);
  const inputId = useId();
  const [draft, setDraft] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // 刚存的那条有入场动画；打开页面时已有的不动。
  const [freshId, setFreshId] = useState<string | null>(null);
  const timer = useRef<number>(undefined);

  const add = useCallback(
    (text: string) => {
      const value = text.trim();
      if (!value) return;
      const id = crypto.randomUUID();
      setNotes((list) => [{ id, text: value }, ...list]);
      setFreshId(id);
    },
    [setNotes],
  );

  // 焦点不在输入框时，在页面任意处粘贴，就直接存成一条便签。
  useEffect(() => {
    if (!first) return;
    const onPaste = (e: ClipboardEvent) => {
      if ((e.target as Element).closest('input, textarea, [contenteditable="true"]')) return;
      const text = e.clipboardData!.getData('text/plain');
      if (!text.trim()) return;
      e.preventDefault();
      add(text);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [add, first]);

  const copy = (note: Note) => {
    // 不等剪贴板 API 返回：它在少数环境下会一直挂起。失败时没有要做的，交给全局记录。
    void navigator.clipboard.writeText(note.text);
    setCopiedId(note.id);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopiedId(null), 1200);
  };

  // 小尺寸不放输入框，只列最近几条；粘贴仍然可以直接存。
  const shown = size === 's' ? notes.slice(0, 3) : notes;

  return (
    <WidgetFrame widget={widget} frame={frame}>
      <div className={`notes notes-${size}`}>
        <WidgetHeader title="便签" meta={notes.length > 0 && `${notes.length} 条`} />

        {size !== 's' && (
          <>
            <label className="sr-only" htmlFor={inputId}>
              新便签
            </label>
            <textarea
              id={inputId}
              className="notes-input"
              rows={1}
              value={draft}
              placeholder="写点什么，回车保存"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // 回车保存，Shift+回车换行；输入法选词时的回车不算。
                if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
                e.preventDefault();
                add(draft);
                setDraft('');
              }}
            />
          </>
        )}

        {notes.length === 0 ? (
          <p className="notes-empty">
            点一下页面空白处再按 {isMac ? '⌘V' : 'Ctrl+V'}，剪贴板里的内容会直接存进来{size === 's' ? '。' : '。点一条就能复制。'}
          </p>
        ) : (
          <ul className="notes-list">
            {shown.map((note) => (
              <li key={note.id} className={note.id === freshId ? 'note is-fresh' : 'note'}>
                <button type="button" className="note-copy" onClick={() => copy(note)} title="点击复制">
                  <span className="note-text">{note.text}</span>
                  <span className={copiedId === note.id ? 'note-state is-copied' : 'note-state'}>
                    {copiedId === note.id ? '已复制' : '复制'}
                  </span>
                </button>
                <button
                  type="button"
                  className="note-remove"
                  aria-label="删除这条便签"
                  onClick={() => setNotes((list) => list.filter((n) => n.id !== note.id))}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                    <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </WidgetFrame>
  );
}

import { useState, type FormEvent } from 'react';
import Dialog from '@/components/common/Dialog';
import { siteOf } from '@/utils/browsing';

type Props = { open: boolean; sites: string[]; onChange: (sites: string[]) => void; onClose: () => void };

// 联想里排除的网站：列出来可以移除，也可以手动添加（粘贴网址或域名，统一成域名）。
export default function ExcludeDialog({ open, sites, onChange, onClose }: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const add = (e: FormEvent) => {
    e.preventDefault();
    const site = siteOf(text);
    if (!site) return setError('这不像一个网站，填域名或网址，例如 example.com');
    if (!sites.includes(site)) onChange([...sites, site]);
    setText('');
    setError('');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="dialog"
      labelledBy="exclude-title"
      onOpen={(el) => {
        setText('');
        setError('');
        el.querySelector('input')?.focus();
      }}
    >
      <form className="dialog-body" onSubmit={add} noValidate>
        <h2 id="exclude-title" className="dialog-title">
          联想里排除的网站
        </h2>
        <p className="exclude-note">
          这些网站（包括子域名）不会出现在搜索框的联想里，浏览器自己的收藏和历史不受影响。也可以在联想里把鼠标移到一条上，点右侧的 ×
          排除它所在的网站。
        </p>

        {sites.length > 0 && (
          <ul className="sources">
            {sites.map((site) => (
              <li key={site}>
                <span className="source-name">{site}</span>
                <button type="button" className="btn btn-danger" onClick={() => onChange(sites.filter((s) => s !== site))}>
                  移除
                </button>
              </li>
            ))}
          </ul>
        )}

        <label className="field">
          <span>添加网站</span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="example.com"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!!error}
            aria-describedby={error ? 'exclude-error' : undefined}
          />
          {error && (
            <span className="field-error" id="exclude-error">
              {error}
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

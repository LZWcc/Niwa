import { useId, useState, type FormEvent } from 'react';
import Dialog from '@/components/common/Dialog';
import { SEARCH_ENGINES } from '@/config';
import { useEngines } from '@/hooks/useEngines';
import { toUserMessage } from '@/utils/errors';
import { originOf, requestOrigins } from '@/utils/permissions';
import { discoverEngine, type Engine } from '@/utils/search/engines';
import { PROBE, siteName, templateFromResult, toUrl } from '@/utils/search/template';
import EngineMark from './EngineMark';

type Props = { open: boolean; onClose: () => void };

// 管理搜索引擎：点一个用它、移除；常用的点一下加上；别的填网站地址，读它声明的搜索方式（OpenSearch），
// 读不到时粘贴一次搜索结果的网址（在那个网站搜 PROBE）。识别出来先给用户看、可以改名字，再添加。
// 搜索框的引擎菜单和设置面板各有一份这个对话框。
export default function EnginesDialog({ open, onClose }: Props) {
  // 两份对话框的 id 不能重复
  const uid = useId();
  const { engines, setEngines, engine, choose } = useEngines();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // 识别出来、等用户确认的
  const [found, setFound] = useState<Engine | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const presets = SEARCH_ENGINES.filter((p) => !engines.some((e) => e.id === p.id));

  const add = ({ id, name, url }: Engine) => {
    setEngines((list) => [...list, { id, name: name.trim(), url }]);
    setAdded(id);
  };

  const propose = (next: Engine) => {
    if (engines.some((e) => e.url === next.url)) return setError('这个搜索引擎已经添加过了');
    setFound(next);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (found) {
      add(found);
      setFound(null);
      setText('');
      return;
    }
    const url = toUrl(text);
    if (!url) return setError('这不像一个网址，填网站地址，例如 yandex.com');
    const template = templateFromResult(url);
    if (template) return propose({ id: crypto.randomUUID(), name: siteName(url), url: template });
    // 权限请求必须在点击里直接发起
    requestOrigins([originOf(url.href)])
      .then(async (granted) => {
        if (!granted) return setError(`需要允许访问 ${url.hostname}，才能找到它的搜索方式`);
        setBusy(true);
        propose(await discoverEngine(url));
      })
      .catch((err) => setError(toUserMessage(err, '识别搜索引擎')))
      .finally(() => setBusy(false));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="dialog dialog-wide"
      labelledBy={`${uid}-title`}
      onOpen={() => {
        setText('');
        setError('');
        setFound(null);
        setAdded(null);
      }}
    >
      <form className="dialog-body" onSubmit={submit} noValidate>
        <h2 id={`${uid}-title`} className="dialog-title">
          搜索引擎
        </h2>

        <section className="sources-block">
          <h3 className="sources-title">点一个使用它</h3>
          <ul className="sources">
            {engines.map((e) => (
              <li key={e.id}>
                <button type="button" className="engine-pick" aria-pressed={e.id === engine.id} title={e.url} onClick={() => choose(e.id)}>
                  <EngineMark engine={e} />
                  <span className="source-name">{e.name}</span>
                </button>
                {e.id === engine.id ? (
                  <span className="source-new">使用中</span>
                ) : (
                  e.id === added && <span className="source-new">已添加</span>
                )}
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={engines.length === 1}
                  onClick={() => setEngines((list) => list.filter((x) => x.id !== e.id))}
                >
                  移除
                </button>
              </li>
            ))}
          </ul>
        </section>

        {presets.length > 0 && (
          <section className="sources-block">
            <h3 className="sources-title">常用</h3>
            <div className="engine-chips">
              {presets.map((p) => (
                <button key={p.id} type="button" className="engine-chip" onClick={() => add(p)}>
                  <EngineMark engine={p} />
                  {p.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {found ? (
          <div className="engine-found">
            <label className="field">
              <span>找到了，名称</span>
              <input value={found.name} onChange={(e) => setFound({ ...found, name: e.target.value })} autoComplete="off" autoFocus />
            </label>
            <span className="field-note">搜索地址：{found.url.replace('%s', '…')}</span>
          </div>
        ) : (
          <label className="field">
            <span>添加其他搜索引擎</span>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="网站地址，例如 yandex.com"
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
                会读网站写明的搜索方式。读不到时，在那个网站搜一下 {PROBE}，把地址栏里的网址粘贴过来。
              </span>
            )}
          </label>
        )}

        <footer className="dialog-actions">
          {found ? (
            <>
              <button type="button" className="btn" onClick={() => setFound(null)}>
                取消
              </button>
              <button type="submit" className="btn btn-primary" disabled={!found.name.trim()}>
                添加
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn" onClick={onClose}>
                完成
              </button>
              <button type="submit" className="btn btn-primary" disabled={!text.trim() || busy}>
                {busy ? '正在识别…' : '识别'}
              </button>
            </>
          )}
        </footer>
      </form>
    </Dialog>
  );
}

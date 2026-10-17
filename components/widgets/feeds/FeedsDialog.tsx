import { useId, useState, type FormEvent } from 'react';
import Dialog from '@/components/common/Dialog';
import { FEEDS } from '@/config';
import type { FeedEntry } from '@/hooks/useFeeds';
import { toUserMessage } from '@/utils/errors';
import { discoverFeed, feedName, fetchFeed, normalizeFeedUrl, originOf, type Feed, type FeedContent } from '@/utils/feeds';
import { requestOrigins } from '@/utils/permissions';

type Props = {
  open: boolean;
  feeds: Feed[];
  entries: Record<string, FeedEntry>;
  onAdd: (feed: Feed, content: FeedContent) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
};

// 管理订阅：列出已有的、移除；填订阅地址或网站首页添加（网页的话找它声明的订阅地址），添加前先取一次，确认能读。
// 访问网站的权限在点“添加”时申请；订阅地址在别的网站上时，再点一次申请那个网站的。

export default function FeedsDialog({ open, feeds, entries, onAdd, onRemove, onClose }: Props) {
  // 放了几个这种小组件时页面上有几份这个对话框，id 不能重复
  const uid = useId();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<string | null>(null);
  // 在网页里找到的、在别的网站上的订阅地址：等用户点一下申请权限
  const [pending, setPending] = useState<string | null>(null);

  const finish = (url: string, content: FeedContent) => {
    const feed = { id: crypto.randomUUID(), url };
    onAdd(feed, content);
    setAdded(feed.id);
    setText('');
    setPending(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setPending(null);
    const url = normalizeFeedUrl(text);
    if (!url) return setError('这不像一个网址');
    if (feeds.length >= FEEDS.max) return setError(`一个订阅小组件最多 ${FEEDS.max} 个订阅，可以再放一个`);
    if (feeds.some((f) => f.url === url)) return setError('这个订阅已经添加过了');
    const host = new URL(url).hostname;
    // 权限请求必须在点击里直接发起
    requestOrigins([originOf(url)])
      .then(async (granted) => {
        if (!granted) return setError(`需要允许访问 ${host}，才能读取订阅`);
        setBusy(true);
        const found = await discoverFeed(url);
        if (feeds.some((f) => f.url === found.url)) return setError('这个网站的订阅已经添加过了');
        if (found.content) finish(found.url, found.content);
        else setPending(found.url);
      })
      // 填的是 http 的话，读不到可能是因为那个网站不支持 https
      .catch((err) =>
        setError(
          toUserMessage(err, '添加订阅') +
            (/^\s*http:\/\//i.test(text) ? '（http 的地址会换成 https 读取，这个网站可能不支持 https）' : ''),
        ),
      )
      .finally(() => setBusy(false));
  };

  const allowPending = (url: string) =>
    requestOrigins([originOf(url)])
      .then(async (granted) => {
        if (!granted) return setError(`需要允许访问 ${new URL(url).hostname}，才能读取订阅`);
        setBusy(true);
        finish(url, await fetchFeed(url));
      })
      .catch((err) => setError(toUserMessage(err, '添加订阅')))
      .finally(() => setBusy(false));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="dialog dialog-wide"
      labelledBy={`${uid}-title`}
      onOpen={(el) => {
        setText('');
        setError('');
        setAdded(null);
        setPending(null);
        el.querySelector('input')?.focus();
      }}
    >
      <form className="dialog-body" onSubmit={submit} noValidate>
        <h2 id={`${uid}-title`} className="dialog-title">
          管理订阅
        </h2>

        {feeds.length > 0 && (
          <section className="sources-block">
            <h3 className="sources-title">已订阅 {feeds.length} 个</h3>
            <ul className="sources">
              {feeds.map((f) => (
                <li key={f.id}>
                  <span className="source-name" title={f.url}>
                    {feedName(f, entries[f.url]?.content)}
                  </span>
                  {f.id === added && <span className="source-new">已添加</span>}
                  <button type="button" className="btn btn-danger" onClick={() => onRemove(f.id)}>
                    移除
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <label className="field">
          <span>{feeds.length ? '添加更多订阅' : '订阅地址或网站'}</span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="https://example.com/feed.xml，或者网站首页"
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
              RSS 或 Atom 的地址；填网站首页的话，会找网页里写的订阅地址。http 的地址会换成 https 读取。
            </span>
          )}
        </label>

        {pending && (
          <p className="feeds-pending">
            找到了订阅地址，在 {new URL(pending).hostname} 上，还要允许访问它。
            <button type="button" className="btn" disabled={busy} onClick={() => allowPending(pending)}>
              允许并添加
            </button>
          </p>
        )}

        <footer className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            完成
          </button>
          <button type="submit" className="btn btn-primary" disabled={!text.trim() || busy}>
            {busy ? '读取中…' : '添加'}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}

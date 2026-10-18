import { useState } from 'react';
import { HOTLIST, type HotSource } from '@/config';
import { useHotAccess, useHotList } from '@/hooks/useHotList';
import { hm } from '@/utils/date';
import AccessPrompt from '../AccessPrompt';
import PanelDialog, { RefreshButton } from '../PanelDialog';

type Props = {
  open: boolean;
  /** 卡片在看的来源：每次打开从它开始 */
  cardSource: HotSource;
  now: Date;
  /** 一栏还是两栏（存在小组件的 settings.hotColumns） */
  columns: 1 | 2;
  onColumns: (columns: 1 | 2) => void;
  onClose: () => void;
};

// 热榜的大面板：上面一排换来源，下面列出全部条目，一栏或两栏（标题栏右边切换）。
// 在面板里看哪个来源不改卡片的，每次打开从卡片的来源开始；缓存和卡片共用（同一个来源不重复请求）。
export default function HotListPanel({ open, cardSource, now, columns, onColumns, onClose }: Props) {
  const [source, setSource] = useState(cardSource);
  const { allowed, request } = useHotAccess(source);
  // 关着时不取
  const { items, error, fetchedAt, loading, refresh } = useHotList(open && allowed ? source : null, now);
  const choose = (s: HotSource) => {
    setSource(s);
    request(s);
  };
  const status = loading ? '更新中…' : items && error ? error : items && fetchedAt ? `${hm(fetchedAt)} 更新` : '';

  let body;
  if (allowed === false) {
    body = (
      <AccessPrompt
        text={`读${source.name}的热榜，需要允许访问 ${new URL(source.url).hostname}。`}
        action="允许访问"
        onRequest={() => request(source)}
      />
    );
  } else if (!items) {
    body = <p className="hot-note">{error ?? '读取中…'}</p>;
  } else {
    body = (
      <ol className={columns === 2 ? 'hot-panel-list is-columns' : 'hot-panel-list'}>
        {items.map((item, i) => (
          <li key={item.url}>
            <a className="hot-entry" href={item.url}>
              <span className={i < 3 ? 'hot-rank is-top' : 'hot-rank'}>{i + 1}</span>
              <span className="hot-entry-title">{item.title}</span>
              {item.hot && <span className="hot-value">{item.hot}</span>}
            </a>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <PanelDialog
      open={open}
      onClose={onClose}
      onOpen={() => setSource(cardSource)}
      title="热榜"
      className="hot-dialog"
      tools={
        <div className="panel-tabs" role="radiogroup" aria-label="来源">
          {HOTLIST.sources.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={s.id === source.id} onClick={() => choose(s)}>
              {s.name}
            </button>
          ))}
        </div>
      }
      status={status}
      actions={
        <>
          <button
            type="button"
            className="panel-button"
            aria-pressed={columns === 2}
            aria-label="两栏显示"
            title={columns === 2 ? '改成一栏' : '改成两栏'}
            onClick={() => onColumns(columns === 2 ? 1 : 2)}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              {columns === 2 ? (
                <path d="M2 3.5h10M2 7h10M2 10.5h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              ) : (
                <path d="M2 3.5h4M8 3.5h4M2 7h4M8 7h4M2 10.5h4M8 10.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              )}
            </svg>
          </button>
          {allowed && <RefreshButton onClick={() => void refresh()} />}
        </>
      }
    >
      {body}
    </PanelDialog>
  );
}

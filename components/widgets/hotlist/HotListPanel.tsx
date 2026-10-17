import { HOTLIST, type HotSource } from '@/config';
import { hm } from '@/utils/date';
import type { HotItem } from '@/utils/hotlist';
import AccessPrompt from '../AccessPrompt';
import PanelDialog, { RefreshButton } from '../PanelDialog';

type Props = {
  open: boolean;
  source: HotSource;
  /** 有没有访问这个来源网站的权限（null：还在查） */
  allowed: boolean | null;
  items: HotItem[] | null;
  error: string | null;
  loading: boolean;
  fetchedAt: number | null;
  onChoose: (source: HotSource) => void;
  onRequest: () => void;
  onRefresh: () => void;
  onClose: () => void;
};

// 热榜的大面板：上面一排换来源（和卡片是同一个设置），下面列出全部条目，带摘要或作者。
export default function HotListPanel({
  open,
  source,
  allowed,
  items,
  error,
  loading,
  fetchedAt,
  onChoose,
  onRequest,
  onRefresh,
  onClose,
}: Props) {
  const status = loading ? '更新中…' : items && error ? error : items && fetchedAt ? `${hm(fetchedAt)} 更新` : '';

  let body;
  if (allowed === false) {
    body = (
      <AccessPrompt
        text={`读${source.name}的热榜，需要允许访问 ${new URL(source.url).hostname}。`}
        action="允许访问"
        onRequest={onRequest}
      />
    );
  } else if (!items) {
    body = <p className="hot-note">{error ?? '读取中…'}</p>;
  } else {
    body = (
      <ol className="hot-panel-list">
        {items.map((item, i) => (
          <li key={item.url}>
            <a className="hot-entry" href={item.url}>
              <span className={i < 3 ? 'hot-rank is-top' : 'hot-rank'}>{i + 1}</span>
              <span className="hot-entry-body">
                <span className="hot-entry-title">{item.title}</span>
                {item.note && <span className="hot-entry-note">{item.note}</span>}
              </span>
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
      title="热榜"
      className="hot-dialog"
      tools={
        <div className="panel-tabs" role="radiogroup" aria-label="来源">
          {HOTLIST.sources.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={s.id === source.id} onClick={() => onChoose(s)}>
              {s.name}
            </button>
          ))}
        </div>
      }
      status={status}
      actions={allowed && <RefreshButton onClick={onRefresh} />}
    >
      {body}
    </PanelDialog>
  );
}

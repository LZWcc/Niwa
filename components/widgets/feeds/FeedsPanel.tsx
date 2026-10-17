import { useState } from 'react';
import type { FeedEntry } from '@/hooks/useFeeds';
import { visitLabel } from '@/utils/browsing';
import { hm } from '@/utils/date';
import { feedName, mergeItems, type Feed } from '@/utils/feeds';
import PanelDialog, { RefreshButton } from '../PanelDialog';

type Props = {
  open: boolean;
  now: Date;
  feeds: Feed[];
  entries: Record<string, FeedEntry>;
  /** 卡片正在看的订阅（null：全部） */
  selected: string | null;
  loading: boolean;
  onRefresh: () => void;
  onManage: () => void;
  onClose: () => void;
};

// 订阅的大面板：左边是全部和每个订阅（几篇、有没有更新失败），右边是文章，带来自哪个订阅、时间和摘要。
// 看哪个订阅只在面板里换，不改卡片的；每次打开从卡片正在看的那个开始。

export default function FeedsPanel({ open, now, feeds, entries, selected: cardSelected, loading, onRefresh, onManage, onClose }: Props) {
  const [selected, setSelected] = useState(cardSelected);
  const feed = feeds.find((f) => f.id === selected) ?? null;
  const contents = Object.fromEntries(feeds.map((f) => [f.url, entries[f.url]?.content]));
  const items = mergeItems(feed ? [feed] : feeds, contents);
  const failed = feeds.filter((f) => entries[f.url]?.error);
  const fetchedAt = Math.max(0, ...feeds.map((f) => entries[f.url]?.fetchedAt ?? 0));
  const status = loading ? '更新中…' : failed.length ? `${failed.length} 个订阅更新失败` : fetchedAt ? `${hm(fetchedAt)} 更新` : '';
  const error = feed && entries[feed.url]?.error;

  const navItem = (id: string | null, name: string, count: number, problem?: string | null) => (
    <li key={id ?? ''}>
      <button
        type="button"
        className={id === (feed?.id ?? null) ? 'feeds-nav-item is-selected' : 'feeds-nav-item'}
        onClick={() => setSelected(id)}
      >
        <span className="feeds-nav-name">{name}</span>
        {problem ? (
          <span className="feeds-nav-error" title={problem}>
            更新失败
          </span>
        ) : (
          <span className="feeds-nav-count">{count}</span>
        )}
      </button>
    </li>
  );

  return (
    <PanelDialog
      open={open}
      onClose={onClose}
      title="订阅"
      className="feeds-dialog"
      onOpen={() => setSelected(cardSelected)}
      status={status}
      actions={<RefreshButton onClick={onRefresh} />}
    >
      <nav className="feeds-nav" aria-label="订阅">
        <ul>
          {navItem(null, '全部', mergeItems(feeds, contents).length)}
          {feeds.map((f) => navItem(f.id, feedName(f, contents[f.url]), contents[f.url]?.items.length ?? 0, entries[f.url]?.error))}
        </ul>
        <button type="button" className="btn feeds-manage" onClick={onManage}>
          管理订阅…
        </button>
      </nav>
      <div className="feeds-content">
        {error && <p className="feeds-note">{error}</p>}
        {items.length === 0 ? (
          !error && <p className="feeds-note">{loading ? '读取中…' : '还没有文章'}</p>
        ) : (
          <ol className="feeds-entries">
            {items.map((item) => (
              <li key={`${item.feed.id}|${item.url}`}>
                <a className="feeds-entry" href={item.url}>
                  <span className="feeds-entry-title">{item.title}</span>
                  <span className="feeds-entry-meta">
                    {[!feed && feedName(item.feed, contents[item.feed.url]), item.time && visitLabel(item.time, now)]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  {item.summary && <span className="feeds-entry-summary">{item.summary}</span>}
                </a>
              </li>
            ))}
          </ol>
        )}
      </div>
    </PanelDialog>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import Popover from '@/components/common/Popover';
import { useFeeds } from '@/hooks/useFeeds';
import { visitLabel } from '@/utils/browsing';
import { feedName, mergeItems, originOf, type Feed, type FeedContent } from '@/utils/feeds';
import { hasOrigins, requestOrigins } from '@/utils/permissions';
import AccessPrompt from '../AccessPrompt';
import type { WidgetProps } from '../types';
import WidgetFrame from '../WidgetFrame';
import WidgetHeader from '../WidgetHeader';
import FeedsDialog from './FeedsDialog';
import FeedsPanel from './FeedsPanel';

// 订阅（RSS / Atom）：几个博客、网站的最新文章合在一起，新的在前；标题栏右边可以只看其中一个（settings.feed）。
// 订阅地址存在自己的 settings.feeds 里，放几个订阅小组件就各订各的。点标题这一行打开大面板（FeedsPanel），带摘要。
// 读订阅要有访问那些网站的权限：添加时申请（在点击里），被收回了卡片里问。

export default function FeedsWidget({ widget, frame, now, settings, onSettings }: WidgetProps) {
  const { size } = widget;
  const feeds = settings.feeds ?? [];
  const origins = [...new Set(feeds.map((f) => originOf(f.url)))];
  const originKey = origins.join(' ');
  // 有没有访问这些网站的权限（null：还在查）。记着是哪几个网站的，订阅变了旧结果不算数
  const [access, setAccess] = useState<{ key: string; ok: boolean } | null>(null);
  useEffect(() => {
    void hasOrigins(originKey ? originKey.split(' ') : []).then((ok) => setAccess({ key: originKey, ok }));
  }, [originKey]);
  const allowed = access?.key === originKey ? access.ok : null;
  const { entries, loading, refresh, remember } = useFeeds(feeds, allowed === true, now);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const selected = feeds.find((f) => f.id === settings.feed) ?? null;
  const contents = Object.fromEntries(feeds.map((f) => [f.url, entries[f.url]?.content]));
  const items = mergeItems(selected ? [selected] : feeds, contents);
  const failed = (selected ? [selected] : feeds).filter((f) => entries[f.url]?.error);
  const status = loading ? '更新中…' : failed.length && items.length ? '更新失败' : '';

  const add = (feed: Feed, content: FeedContent) => {
    remember(feed.url, content);
    onSettings((s) => ({ feeds: [...(s.feeds ?? []), feed] }));
  };
  const remove = (id: string) =>
    onSettings((s) => ({ feeds: (s.feeds ?? []).filter((f) => f.id !== id), feed: s.feed === id ? undefined : s.feed }));

  let body;
  if (!feeds.length) {
    body = (
      <div className="feeds-empty">
        <p>添加博客或网站的 RSS 订阅，看它们的最新文章。</p>
        <button type="button" className="btn btn-primary" onClick={() => setDialogOpen(true)}>
          添加订阅
        </button>
      </div>
    );
  } else if (allowed === false) {
    body = (
      <AccessPrompt
        text={`读订阅需要允许访问 ${origins.length} 个网站。`}
        action="允许访问"
        onRequest={() => void requestOrigins(origins).then((ok) => setAccess({ key: originKey, ok }))}
      />
    );
  } else if (!items.length) {
    body = (
      <p className="feeds-note">
        {failed.length ? entries[failed[0]!.url]!.error : loading || allowed === null ? '读取中…' : '还没有文章'}
      </p>
    );
  } else {
    body = (
      <ol className="feeds-list">
        {items.slice(0, size === 's' ? 6 : 50).map((item) => (
          <li key={`${item.feed.id}|${item.url}`}>
            <a className="feeds-row" href={item.url} title={item.title} draggable={false}>
              <span className="feeds-title">{item.title}</span>
              {size !== 's' && item.time && <span className="feeds-time">{visitLabel(item.time, now)}</span>}
            </a>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <WidgetFrame
      widget={widget}
      frame={frame}
      menu={
        <>
          {feeds.length > 0 && allowed && (
            <button type="button" role="menuitem" className="menu-item" onClick={() => void refresh()}>
              立即刷新
            </button>
          )}
          <button type="button" role="menuitem" className="menu-item" onClick={() => setDialogOpen(true)}>
            管理订阅…
          </button>
        </>
      }
    >
      <div className={`feeds feeds-${size}`}>
        <WidgetHeader
          title="订阅"
          meta={status && <span title={failed.map((f) => entries[f.url]?.error).join('\n')}>{status}</span>}
          onOpen={feeds.length ? () => setPanelOpen(true) : undefined}
        >
          {feeds.length > 1 && (
            <button
              ref={anchor}
              type="button"
              className="feeds-pick"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={`看哪个订阅：${selected ? feedName(selected, contents[selected.url]) : '全部'}`}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span>{selected ? feedName(selected, contents[selected.url]) : '全部'}</span>
              <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
                <path d="M1.5 3 4 5.5 6.5 3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </WidgetHeader>
        {body}
      </div>
      {menuOpen && (
        <Popover anchor={anchor.current} placement="bottom-end" onClose={closeMenu} role="menu" label="看哪个订阅" className="feeds-menu">
          {[null, ...feeds].map((f) => (
            <button
              key={f?.id ?? ''}
              type="button"
              role="menuitemradio"
              aria-checked={(f?.id ?? null) === (selected?.id ?? null)}
              className="menu-item"
              onClick={() => {
                setMenuOpen(false);
                onSettings(() => ({ feed: f?.id }));
              }}
            >
              {f ? feedName(f, contents[f.url]) : '全部'}
            </button>
          ))}
        </Popover>
      )}
      <FeedsDialog open={dialogOpen} feeds={feeds} entries={entries} onAdd={add} onRemove={remove} onClose={() => setDialogOpen(false)} />
      <FeedsPanel
        open={panelOpen}
        now={now}
        feeds={feeds}
        entries={entries}
        selected={selected?.id ?? null}
        loading={loading}
        onRefresh={() => void refresh()}
        onManage={() => setDialogOpen(true)}
        onClose={() => setPanelOpen(false)}
      />
    </WidgetFrame>
  );
}

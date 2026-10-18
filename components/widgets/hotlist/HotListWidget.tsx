import { useCallback, useRef, useState } from 'react';
import Popover from '@/components/common/Popover';
import { HOTLIST, type HotSource } from '@/config';
import { useHotAccess, useHotList } from '@/hooks/useHotList';
import { HOT_SOURCES, type HotSourceId } from '@/utils/hotlist';
import AccessPrompt from '../AccessPrompt';
import type { WidgetProps } from '../types';
import WidgetFrame from '../WidgetFrame';
import WidgetHeader from '../WidgetHeader';
import HotListPanel from './HotListPanel';

// 热榜：知乎、微博、B 站等的热门，标题栏右边换来源（存在自己的 settings.hotSource，放几个热榜就各看各的）。
// 这些接口不允许跨域，要有访问那个网站的权限：换来源时申请（在点击里），没给时卡片里问。
// 点标题这一行打开大面板看全部条目（在面板里换来源不改卡片）。

export default function HotListWidget({ widget, frame, now, settings, onSettings }: WidgetProps) {
  const { size } = widget;
  const source: HotSource = HOT_SOURCES.get(settings.hotSource as HotSourceId) ?? HOTLIST.sources[0]!;
  const { allowed, request } = useHotAccess(source);
  const { items, error, loading, refresh } = useHotList(allowed ? source : null, now);
  const [panelOpen, setPanelOpen] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const choose = (s: HotSource) => {
    setMenuOpen(false);
    onSettings(() => ({ hotSource: s.id }));
    request(s);
  };

  const status = loading ? '更新中…' : error && items ? '更新失败' : '';
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
      <ol className="hot-list">
        {items.slice(0, size === 's' ? 6 : 50).map((item, i) => (
          <li key={item.url}>
            <a className="hot-row" href={item.url} title={item.title} draggable={false}>
              <span className={i < 3 ? 'hot-rank is-top' : 'hot-rank'}>{i + 1}</span>
              <span className="hot-title">{item.title}</span>
              {size !== 's' && item.hot && <span className="hot-value">{item.hot}</span>}
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
        allowed && (
          <button type="button" role="menuitem" className="menu-item" onClick={() => void refresh()}>
            立即刷新
          </button>
        )
      }
    >
      <div className={`hot hot-${size}`}>
        <WidgetHeader title="热榜" meta={status && <span title={error ?? undefined}>{status}</span>} onOpen={() => setPanelOpen(true)}>
          <button
            ref={anchor}
            type="button"
            className="hot-source"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`来源：${source.name}`}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {source.name}
            <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
              <path d="M1.5 3 4 5.5 6.5 3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
        </WidgetHeader>
        {body}
      </div>
      {menuOpen && (
        <Popover anchor={anchor.current} placement="bottom-end" onClose={closeMenu} role="menu" label="热榜来源" className="hot-menu">
          {HOTLIST.sources.map((s) => (
            <button
              key={s.id}
              type="button"
              role="menuitemradio"
              aria-checked={s.id === source.id}
              className="menu-item"
              onClick={() => choose(s)}
            >
              {s.name}
              {s.login && <span className="hot-login">需登录</span>}
            </button>
          ))}
        </Popover>
      )}
      <HotListPanel
        open={panelOpen}
        cardSource={source}
        now={now}
        columns={settings.hotColumns ?? 1}
        onColumns={(hotColumns) => onSettings(() => ({ hotColumns }))}
        onClose={() => setPanelOpen(false)}
      />
    </WidgetFrame>
  );
}

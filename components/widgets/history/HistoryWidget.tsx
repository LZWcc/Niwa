import { useState } from 'react';
import { useBrowsingHistory, type HistoryTab } from '@/hooks/useBrowsingHistory';
import { usePermissions } from '@/hooks/usePermissions';
import { hostOf, visitLabel } from '@/utils/browsing';
import { KEYS } from '@/utils/storage';
import AccessPrompt from '../AccessPrompt';
import LinkRow from '../LinkRow';
import LinksSearch from '../LinksSearch';
import type { WidgetProps } from '../types';
import WidgetFrame from '../WidgetFrame';

// 历史：最近看过的、常去的网站，大尺寸再加最近关闭的标签页（点了恢复）。记住上次看的是哪一组。
// 中、大尺寸可以搜索全部浏览记录。

// 最近关闭的网址和标题要有 tabs 权限才拿得到。
const PERMISSIONS = ['history', 'topSites', 'sessions', 'tabs'];

const TABS: Record<HistoryTab, { name: string; empty: string }> = {
  recent: { name: '最近', empty: '还没有浏览记录' },
  top: { name: '常去', empty: '还没有常去的网站' },
  closed: { name: '最近关闭', empty: '最近没有关闭的标签页' },
};

export default function HistoryWidget({ widget, frame, now }: WidgetProps) {
  const { size } = widget;
  const [granted, request] = usePermissions(PERMISSIONS);
  const [saved, setSaved] = useState(() => localStorage.getItem(KEYS.historyTab));
  // null：没在搜索
  const [query, setQuery] = useState<string | null>(null);
  const searching = size !== 's' && query !== null;
  const tabs = (Object.keys(TABS) as HistoryTab[]).filter((t) => t !== 'closed' || size === 'l');
  const tab = tabs.find((t) => t === saved) ?? 'recent';
  const { pages, restore } = useBrowsingHistory(granted ? tab : null, searching ? query : '', now);

  const choose = (t: HistoryTab) => {
    setSaved(t);
    localStorage.setItem(KEYS.historyTab, t);
  };

  return (
    <WidgetFrame widget={widget} frame={frame}>
      <div className={`links links-${size}`}>
        {granted === false ? (
          <AccessPrompt
            text="在这里显示最近看过和常去的网站，需要允许读取浏览记录。只在这台电脑上显示。"
            action="允许读取浏览记录"
            onRequest={request}
          />
        ) : (
          <>
            <header className="links-head">
              {searching ? (
                <LinksSearch label="搜索浏览记录" query={query} onChange={setQuery} />
              ) : (
                <>
                  {/* 小尺寸放不下标题，只留切换 */}
                  <h2 className={size === 's' ? 'sr-only' : 'widget-title'}>历史</h2>
                  <div className="links-tabs" role="group" aria-label="显示哪一组">
                    {tabs.map((t) => (
                      <button key={t} type="button" className="links-tab" aria-pressed={t === tab} onClick={() => choose(t)}>
                        {TABS[t].name}
                      </button>
                    ))}
                  </div>
                  {size !== 's' && <LinksSearch label="搜索浏览记录" query={null} onChange={setQuery} />}
                </>
              )}
            </header>

            {pages &&
              (pages.length === 0 ? (
                <p className="links-empty">{searching && query.trim() ? '没有找到' : TABS[tab].empty}</p>
              ) : (
                <ul className="links-list">
                  {pages.map((page) => (
                    <li key={page.key}>
                      <LinkRow
                        url={page.url}
                        title={page.title}
                        meta={size === 's' ? undefined : page.time === undefined ? hostOf(page.url) : visitLabel(page.time, now)}
                        onRestore={page.session ? () => restore(page.session!) : undefined}
                      />
                    </li>
                  ))}
                </ul>
              ))}
          </>
        )}
      </div>
    </WidgetFrame>
  );
}

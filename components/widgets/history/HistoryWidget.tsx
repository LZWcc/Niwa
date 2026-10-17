import { useState } from 'react';
import { useBrowsingHistory } from '@/hooks/useBrowsingHistory';
import { usePermissions } from '@/hooks/usePermissions';
import { HISTORY_TABS, HISTORY_TAB_TEXT as TABS, hostOf, visitLabel, type HistoryTab } from '@/utils/browsing';
import AccessPrompt from '../AccessPrompt';
import LinkRow from '../LinkRow';
import LinksSearch from '../LinksSearch';
import type { WidgetProps } from '../types';
import WidgetFrame from '../WidgetFrame';
import WidgetHeader from '../WidgetHeader';
import HistoryPanel from './HistoryPanel';

// 历史：最近看过的、常去的网站，大尺寸再加最近关闭的标签页（点了恢复）。记住上次看的是哪一组（settings.tab，放了几个时各记各的）。
// 中、大尺寸可以搜索全部浏览记录。点标题这一行打开大面板（HistoryPanel）。

// 最近关闭的网址和标题要有 tabs 权限才拿得到。
const PERMISSIONS = ['history', 'topSites', 'sessions', 'tabs'];

export default function HistoryWidget({ widget, frame, now, settings, onSettings }: WidgetProps) {
  const { size } = widget;
  const [granted, request] = usePermissions(PERMISSIONS);
  // null：没在搜索
  const [query, setQuery] = useState<string | null>(null);
  const searching = size !== 's' && query !== null;
  const tabs = HISTORY_TABS.filter((t) => t !== 'closed' || size === 'l');
  const tab = tabs.find((t) => t === settings.tab) ?? 'recent';
  const { pages, restore } = useBrowsingHistory(granted ? tab : null, searching ? query : '', now);

  const choose = (t: HistoryTab) => onSettings(() => ({ tab: t }));
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <WidgetFrame widget={widget} frame={frame}>
      <div className={`links links-${size}`}>
        {granted === false ? (
          <>
            <WidgetHeader title="历史" />
            <AccessPrompt
              text="在这里显示最近看过和常去的网站，需要允许读取浏览记录。只在这台电脑上显示。"
              action="允许读取浏览记录"
              onRequest={request}
            />
          </>
        ) : (
          <>
            {searching ? (
              <header className="widget-head">
                <LinksSearch label="搜索浏览记录" query={query} onChange={setQuery} />
              </header>
            ) : (
              <WidgetHeader title="历史" onOpen={() => setPanelOpen(true)}>
                <div className="links-tabs" role="group" aria-label="显示哪一组">
                  {tabs.map((t) => (
                    <button key={t} type="button" className="links-tab" aria-pressed={t === tab} onClick={() => choose(t)}>
                      {TABS[t].name}
                    </button>
                  ))}
                </div>
                {size !== 's' && <LinksSearch label="搜索浏览记录" query={null} onChange={setQuery} />}
              </WidgetHeader>
            )}

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
      {granted && <HistoryPanel open={panelOpen} now={now} tab={tab} onClose={() => setPanelOpen(false)} />}
    </WidgetFrame>
  );
}

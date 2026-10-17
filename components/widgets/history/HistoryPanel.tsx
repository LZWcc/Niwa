import { useState } from 'react';
import { useBrowsingHistory, type Page } from '@/hooks/useBrowsingHistory';
import { HISTORY_TABS, HISTORY_TAB_TEXT as TABS, hostOf, visitLabel, type HistoryTab } from '@/utils/browsing';
import { DAY, hm, startOfDay, WEEKDAYS } from '@/utils/date';
import LinkRow from '../LinkRow';
import PanelDialog from '../PanelDialog';

type Props = { open: boolean; now: Date; tab: HistoryTab; onClose: () => void };

// 历史的大面板：三组都在（卡片小的时候没有「最近关闭」），能搜索；浏览记录按天分组，条数比卡片多。
// 看哪一组只在面板里换，不改卡片的；每次打开从卡片正在看的那一组开始。

const LIMIT = 500;

/** 分组的标题：今天、昨天，更早写日期和星期 */
function dayTitle(day: number, now: Date) {
  const days = Math.round((startOfDay(now.getTime()) - day) / DAY);
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  const d = new Date(day);
  return `${d.getMonth() + 1}月${d.getDate()}日 星期${WEEKDAYS[d.getDay()]}`;
}

export default function HistoryPanel({ open, now, tab: cardTab, onClose }: Props) {
  const [tab, setTab] = useState(cardTab);
  const [query, setQuery] = useState('');
  const searching = query.trim() !== '';
  const { pages, restore } = useBrowsingHistory(open ? tab : null, query, now, LIMIT);

  const row = (page: Page, meta?: string) => (
    <li key={page.key}>
      <LinkRow url={page.url} title={page.title} meta={meta} onRestore={page.session ? () => restore(page.session!) : undefined} />
    </li>
  );

  let body = null;
  if (pages?.length === 0) {
    body = <p className="links-empty">{searching ? '没有找到' : TABS[tab].empty}</p>;
  } else if (pages && (searching || tab === 'recent')) {
    // 按访问的那一天分组，每条写时刻
    const groups = Map.groupBy(pages, (p) => startOfDay(p.time!));
    body = [...groups].map(([day, list]) => (
      <section key={day} className="panel-group">
        <h3>{dayTitle(day, now)}</h3>
        <ul className="links-list">{list.map((p) => row(p, hm(p.time!)))}</ul>
      </section>
    ));
  } else if (pages) {
    body = <ul className="links-list">{pages.map((p) => row(p, p.time === undefined ? hostOf(p.url) : visitLabel(p.time, now)))}</ul>;
  }

  return (
    <PanelDialog
      open={open}
      onClose={onClose}
      title="历史"
      className="history-dialog"
      onOpen={(el) => {
        setTab(cardTab);
        setQuery('');
        el.querySelector<HTMLElement>('.panel-search')?.focus();
      }}
      tools={
        <>
          <div className="panel-tabs" role="group" aria-label="显示哪一组">
            {HISTORY_TABS.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={!searching && t === tab}
                onClick={() => {
                  setTab(t);
                  setQuery('');
                }}
              >
                {TABS[t].name}
              </button>
            ))}
          </div>
          <input
            className="panel-search"
            value={query}
            placeholder="搜索全部浏览记录"
            aria-label="搜索全部浏览记录"
            onChange={(e) => setQuery(e.target.value)}
          />
        </>
      }
      status={searching && pages ? `找到 ${pages.length} 条` : ''}
    >
      {body}
    </PanelDialog>
  );
}

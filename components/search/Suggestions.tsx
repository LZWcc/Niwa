import { useState } from 'react';
import type { Suggestion } from '@/hooks/useSuggestions';
import { hostOf } from '@/utils/browsing';
import { faviconUrl } from '@/utils/icons/model';

type Props = {
  items: Suggestion[];
  active: number;
  /** 还没有读取收藏夹和浏览记录的权限：显示一行询问 */
  ask: boolean;
  onHover: (index: number) => void;
  /** 点一条右侧的 ×：以后不再联想这个网站 */
  onExclude: (url: string) => void;
  onAllow: () => void;
  onDismiss: () => void;
};

function Icon({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="suggest-icon" aria-hidden="true">
      {failed ? (
        hostOf(url).slice(0, 1).toUpperCase()
      ) : (
        <img src={faviconUrl(url, 32)} alt="" width="16" height="16" draggable={false} onError={() => setFailed(true)} />
      )}
    </span>
  );
}

// 搜索框下面的联想：收藏和浏览记录里匹配的网站，键盘选择由 Search 处理。
// 按下时不抢走输入框的焦点（否则输入框失焦、联想收起，点击就落空了）。
export default function Suggestions({ items, active, ask, onHover, onExclude, onAllow, onDismiss }: Props) {
  return (
    <div className="suggest" onPointerDown={(e) => e.preventDefault()}>
      {items.length > 0 && (
        <ul id="search-suggestions" role="listbox" aria-label="收藏和浏览记录">
          {items.map((s, i) => (
            <li key={s.url} id={`search-option-${i}`} role="option" aria-selected={i === active}>
              <a className="suggest-row" href={s.url} tabIndex={-1} draggable={false} onPointerEnter={() => onHover(i)}>
                <Icon url={s.url} />
                <span className="suggest-title">{s.title}</span>
                <span className="suggest-host">{hostOf(s.url)}</span>
                <span className="suggest-kind">{s.kind === 'bookmark' ? '收藏' : '历史'}</span>
              </a>
              <button
                type="button"
                className="suggest-remove"
                tabIndex={-1}
                aria-label={`不再联想 ${hostOf(s.url)}`}
                title={`不再联想 ${hostOf(s.url)}`}
                onClick={() => onExclude(s.url)}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                  <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
      {ask && (
        <p className="suggest-ask">
          在收藏夹和浏览记录里一起找？
          <button type="button" className="btn" onClick={onAllow}>
            允许
          </button>
          <button type="button" className="suggest-dismiss" onClick={onDismiss}>
            不用了
          </button>
        </p>
      )}
    </div>
  );
}

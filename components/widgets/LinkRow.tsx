import { useState } from 'react';
import { hostOf } from '@/utils/browsing';
import { faviconUrl } from '@/utils/icons/model';

type Props = { url: string; title: string; meta?: string; onRestore?: () => void };

// 收藏夹、历史里的一行：网站图标、标题、右侧的时间或域名。
// 是普通链接，⌘ / Ctrl 点击、中键点击在新标签页打开；传了 onRestore 的（最近关闭）是按钮，点了恢复。
// 图标取自浏览器本地缓存，不联网；取不到时显示域名的首字母。
export default function LinkRow({ url, title, meta, onRestore }: Props) {
  const [failed, setFailed] = useState(false);
  const body = (
    <>
      <span className="link-icon" aria-hidden="true">
        {failed ? (
          hostOf(url).slice(0, 1).toUpperCase()
        ) : (
          <img src={faviconUrl(url, 32)} alt="" width="16" height="16" draggable={false} onError={() => setFailed(true)} />
        )}
      </span>
      <span className="link-title">{title}</span>
      {meta && <span className="link-meta">{meta}</span>}
    </>
  );
  return onRestore ? (
    <button type="button" className="link-row" title={url} onClick={onRestore}>
      {body}
    </button>
  ) : (
    <a className="link-row" href={url} title={url} draggable={false}>
      {body}
    </a>
  );
}

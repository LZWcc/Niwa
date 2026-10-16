import { useState } from 'react';
import { faviconUrl, type IconSpec } from '@/utils/icons/model';

type Props = { name: string; url: string | null; icon?: IconSpec };

// 设置了图标的：图片满铺，文字图标是彩色底白字。
// 没设置的（默认项、更早添加的）：用 Chromium 的 _favicon 接口从浏览器本地缓存取图标，不发网络请求，
// 需要 manifest 的 favicon 权限；取不到（没访问过、Firefox）时退回首字母。
export default function ShortcutIcon({ name, url, icon }: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (icon?.kind === 'image') {
    return (
      <span className="shortcut-icon is-image" aria-hidden="true">
        <img src={icon.src} alt="" draggable={false} />
      </span>
    );
  }
  if (icon?.kind === 'text') {
    return (
      <span className="shortcut-icon is-text" style={{ background: icon.color }} aria-hidden="true">
        {icon.text}
      </span>
    );
  }
  return (
    <span className="shortcut-icon" aria-hidden="true">
      {url && failedUrl !== url ? (
        <img src={faviconUrl(url, 64)} alt="" width="22" height="22" draggable={false} onError={() => setFailedUrl(url)} />
      ) : (
        name.trim().slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

import { useState } from 'react';
import Dialog from '@/components/common/Dialog';
import type { LinkDraft } from '@/hooks/grid/useGrid';
import { useSiteIcons } from '@/hooks/useSiteIcons';
import type { LinkItem } from '@/utils/grid/items';
import { nameFromUrl, normalizeUrl } from '@/utils/grid/links';
import { defaultTextIcon, type IconSpec } from '@/utils/icons/model';
import IconPicker from './IconPicker';
import ShortcutIcon from './ShortcutIcon';

type Props = {
  /** undefined：不显示；null：新建；对象：编辑 */
  target: LinkItem | null | undefined;
  /** 编辑时它现在的图标 */
  icon?: IconSpec;
  onSave: (link: LinkDraft) => void;
  onDelete: () => void;
  onClose: () => void;
};

export default function ShortcutDialog({ target, icon: currentIcon, onSave, onDelete, onClose }: Props) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  // 用户选定的图标；null 表示自动：有网站图标就用第一个，没有就用文字图标。
  const [icon, setIcon] = useState<IconSpec | null>(null);

  const href = normalizeUrl(url);
  const fallbackName = href ? nameFromUrl(href) : '';
  const site = useSiteIcons(href);
  const textIcon = defaultTextIcon(name || fallbackName || '+', href);
  const shown: IconSpec = icon ?? (site.icons[0] ? { kind: 'image', src: site.icons[0] } : textIcon);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!href) return;
    onSave({ name: name.trim() || fallbackName, url: href, icon: shown });
  };

  const error = touched && !href ? '请输入有效的网址，例如 github.com' : '';

  return (
    <Dialog
      open={target !== undefined}
      onClose={onClose}
      className="dialog"
      labelledBy="dialog-title"
      onOpen={() => {
        setUrl(target?.url ?? '');
        setName(target?.name ?? '');
        setTouched(false);
        setIcon(currentIcon ?? null);
      }}
    >
      <form className="dialog-body" onSubmit={submit} noValidate>
        <header className="dialog-head">
          <ShortcutIcon name={name || fallbackName || '+'} url={href} icon={shown} />
          <h2 id="dialog-title">{target ? '编辑快捷方式' : '添加快捷方式'}</h2>
        </header>

        <label className="field">
          <span>网址</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => url && setTouched(true)}
            placeholder="github.com"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            aria-invalid={!!error}
            aria-describedby={error ? 'url-error' : undefined}
          />
          {error && (
            <span className="field-error" id="url-error">
              {error}
            </span>
          )}
        </label>

        <label className="field">
          <span>名称</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={fallbackName || '留空则使用网站名'}
            autoComplete="off"
          />
        </label>

        <IconPicker value={shown} site={site} textIcon={textIcon} onChange={setIcon} />

        <footer className="dialog-actions">
          {target && (
            <button type="button" className="btn btn-danger" onClick={onDelete}>
              删除
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="btn btn-primary" disabled={!url.trim()}>
            保存
          </button>
        </footer>
      </form>
    </Dialog>
  );
}

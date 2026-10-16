import { useState } from 'react';
import { ICONS } from '@/config';
import type { SiteIcons } from '@/hooks/useSiteIcons';
import { toUserMessage } from '@/utils/errors';
import { toIconImage } from '@/utils/icons/image';
import type { IconSpec, TextIcon } from '@/utils/icons/model';

type Props = {
  value: IconSpec;
  site: SiteIcons;
  /** 选“文字”时的默认样子 */
  textIcon: TextIcon;
  onChange: (icon: IconSpec) => void;
};

// 选快捷方式的图标：从网站获取的候选图、文字图标（可以改字和颜色）、上传图片。
export default function IconPicker({ value, site, textIcon, onChange }: Props) {
  const [error, setError] = useState('');
  const images = [...new Set([...(value.kind === 'image' ? [value.src] : []), ...site.icons])];
  const text = value.kind === 'text' ? value : textIcon;

  const upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 同一个文件可以再选一次
    if (!file) return;
    setError('');
    toIconImage(file).then(
      ({ src }) => onChange({ kind: 'image', src }),
      (err) => setError(toUserMessage(err, '上传图标')),
    );
  };

  const status = site.loading
    ? '正在获取网站图标…'
    : site.done && site.icons.length === 0
      ? '没找到这个网站的图标，可以用文字图标或上传图片'
      : '';

  return (
    <div className="field">
      <span id="icon-label">图标</span>
      <div className="icon-options" role="radiogroup" aria-labelledby="icon-label">
        {images.map((src) => (
          <button
            key={src}
            type="button"
            role="radio"
            aria-checked={value.kind === 'image' && value.src === src}
            aria-label="图片图标"
            className="icon-option"
            onClick={() => onChange({ kind: 'image', src })}
          >
            <img src={src} alt="" />
          </button>
        ))}
        <button
          type="button"
          role="radio"
          aria-checked={value.kind === 'text'}
          aria-label="文字图标"
          className="icon-option is-text"
          style={{ background: text.color }}
          onClick={() => onChange(text)}
        >
          {text.text}
        </button>
        <label className="icon-option is-upload" title="上传图片">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input type="file" accept="image/*" hidden onChange={upload} />
        </label>
      </div>

      {site.needsAccess && (
        <div className="icon-status">
          <button type="button" className="btn" onClick={() => void site.allow()}>
            自动获取网站图标
          </button>
          <span>需要允许访问网站；只在添加快捷方式时联网</span>
        </div>
      )}
      {status && <span className="icon-status">{status}</span>}
      {error && <span className="field-error">{error}</span>}

      {value.kind === 'text' && (
        <div className="icon-text">
          <input value={value.text} maxLength={2} aria-label="图标上的字" onChange={(e) => onChange({ ...value, text: e.target.value })} />
          <div className="icon-colors" role="radiogroup" aria-label="图标颜色">
            {ICONS.textColors.map((color) => (
              <button
                key={color}
                type="button"
                role="radio"
                aria-checked={value.color === color}
                aria-label={color}
                className="icon-color"
                style={{ background: color }}
                onClick={() => onChange({ ...value, color })}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

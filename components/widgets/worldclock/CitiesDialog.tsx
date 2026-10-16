import { useId, useState } from 'react';
import Dialog from '@/components/common/Dialog';
import { WORLD_CLOCK, type City } from '@/config';

type Props = { open: boolean; cities: City[]; onChange: (ids: string[]) => void; onClose: () => void };

// 选城市：上面是已经放的（可以移除），下面按中文名或英文名搜，点一个加上。
export default function CitiesDialog({ open, cities, onChange, onClose }: Props) {
  // 放了几个这种小组件时页面上有几份这个对话框，id 不能重复
  const uid = useId();
  const [text, setText] = useState('');
  const q = text.trim().toLowerCase();
  const ids = cities.map((c) => c.id);
  const results = q ? WORLD_CLOCK.cities.filter((c) => !ids.includes(c.id) && `${c.name} ${c.en} ${c.zone}`.toLowerCase().includes(q)) : [];
  const full = cities.length >= WORLD_CLOCK.max;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="dialog"
      labelledBy={`${uid}-title`}
      onOpen={(el) => {
        setText('');
        el.querySelector('input')?.focus();
      }}
    >
      <div className="dialog-body">
        <h2 id={`${uid}-title`} className="dialog-title">
          世界时钟的城市
        </h2>

        {cities.length > 0 && (
          <ul className="sources">
            {cities.map((c) => (
              <li key={c.id}>
                <span className="source-name">
                  {c.name}
                  <span className="place-region"> {c.en}</span>
                </span>
                <button type="button" className="btn btn-danger" onClick={() => onChange(ids.filter((id) => id !== c.id))}>
                  移除
                </button>
              </li>
            ))}
          </ul>
        )}

        <label className="field">
          <span>{full ? `最多放 ${WORLD_CLOCK.max} 个城市` : '添加城市'}</span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="例如：东京、London"
            autoComplete="off"
            spellCheck={false}
            disabled={full}
          />
        </label>
        {q &&
          (results.length ? (
            <ul className="places">
              {results.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="place"
                    onClick={() => {
                      onChange([...ids, c.id]);
                      setText('');
                    }}
                  >
                    <span className="place-name">{c.name}</span>
                    <span className="place-region">{c.en}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="places-empty">没有这个城市，换个写法试试（城市表在 config.ts 的 WORLD_CLOCK）</p>
          ))}

        <footer className="dialog-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            完成
          </button>
        </footer>
      </div>
    </Dialog>
  );
}

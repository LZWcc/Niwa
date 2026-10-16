import { useState, type FormEvent } from 'react';
import Dialog from '@/components/common/Dialog';
import { toUserMessage } from '@/utils/errors';
import { searchPlaces, type Place } from '@/utils/weather';

type Props = { open: boolean; onClose: () => void; onPick: (place: Place) => void };

// 选择城市：输入城市名搜索，同名的按省份、国家区分，点一个就选定。
export default function PlaceDialog({ open, onClose, onPick }: Props) {
  const [text, setText] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const search = (e: FormEvent) => {
    e.preventDefault();
    const name = text.trim();
    if (!name) return;
    setBusy(true);
    setError('');
    searchPlaces(name)
      .then(setResults, (err) => setError(toUserMessage(err, `搜索城市 ${name}`)))
      .finally(() => setBusy(false));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="dialog"
      labelledBy="place-dialog-title"
      onOpen={(el) => {
        setText('');
        setResults(null);
        setError('');
        el.querySelector('input')?.focus();
      }}
    >
      <form className="dialog-body" onSubmit={search} noValidate>
        <h2 id="place-dialog-title" className="dialog-title">
          选择城市
        </h2>
        <label className="field">
          <span>城市</span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="例如：杭州、Tokyo"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!!error}
            aria-describedby={error ? 'place-error' : 'place-note'}
          />
          {error ? (
            <span className="field-error" id="place-error">
              {error}
            </span>
          ) : (
            <span className="field-note" id="place-note">
              天气来自 Open-Meteo，只会把城市的经纬度发给它。
            </span>
          )}
        </label>

        {results &&
          (results.length ? (
            <ul className="places">
              {results.map((p) => (
                <li key={p.id}>
                  <button type="button" className="place" onClick={() => onPick(p)}>
                    <span className="place-name">{p.name}</span>
                    <span className="place-region">{p.region}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="places-empty">没有找到这个城市，换个写法试试</p>
          ))}

        <footer className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="btn btn-primary" disabled={!text.trim() || busy}>
            {busy ? '搜索中…' : '搜索'}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}

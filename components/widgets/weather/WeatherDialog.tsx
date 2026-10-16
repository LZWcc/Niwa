import { useState, type FormEvent } from 'react';
import Dialog from '@/components/common/Dialog';
import { WEATHER } from '@/config';
import type { WeatherState } from '@/hooks/useWeather';
import { toUserMessage } from '@/utils/errors';
import { normalizeHost, searchPlaces, type Place } from '@/utils/weather';

type Props = { open: boolean; weather: WeatherState; onPick: (place: Place) => void; onClose: () => void };

// 天气设置：先填和风天气的 API Host 和 KEY（保存前试搜一次，确认填对了），再按名称搜城市，点一个就选定。
export default function WeatherDialog({ open, weather, onPick, onClose }: Props) {
  const { account, setAccount } = weather;
  const [editing, setEditing] = useState(!account);
  const [host, setHost] = useState('');
  const [key, setKey] = useState('');
  const [text, setText] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (editing) {
      const next = { host: normalizeHost(host), key: key.trim() };
      if (!next.host || !next.key) return setError('API Host 和 API KEY 都要填');
      setBusy(true);
      searchPlaces(next, '北京')
        .then(
          () => {
            setAccount(next);
            setEditing(false);
          },
          (err) => setError(toUserMessage(err, '验证和风天气的 KEY')),
        )
        .finally(() => setBusy(false));
      return;
    }
    const name = text.trim();
    if (!name || !account) return;
    setBusy(true);
    searchPlaces(account, name)
      .then(setResults, (err) => setError(toUserMessage(err, `搜索城市 ${name}`)))
      .finally(() => setBusy(false));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="dialog"
      labelledBy="weather-dialog-title"
      onOpen={(el) => {
        setEditing(!account);
        setHost(account?.host ?? '');
        setKey(account?.key ?? '');
        setText('');
        setResults(null);
        setError('');
        el.querySelector('input')?.focus();
      }}
    >
      <form className="dialog-body" onSubmit={submit} noValidate>
        <h2 id="weather-dialog-title" className="dialog-title">
          天气设置
        </h2>

        {editing ? (
          <>
            <ol className="steps">
              <li>
                在{' '}
                <a href={WEATHER.console} target="_blank" rel="noreferrer">
                  和风天气控制台
                </a>{' '}
                注册并完成实名认证（免费）
              </li>
              <li>新建项目，凭据选「API KEY」，复制 KEY</li>
              <li>在控制台的「设置」里复制 API Host</li>
            </ol>
            <label className="field">
              <span>API Host</span>
              <input
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="abc1234xyz.re.qweatherapi.com"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <label className="field">
              <span>API KEY</span>
              <input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={!!error}
                aria-describedby={error ? 'weather-error' : 'weather-key-note'}
              />
              {error ? (
                <span className="field-error" id="weather-error">
                  {error}
                </span>
              ) : (
                <span className="field-note" id="weather-key-note">
                  KEY 相当于密码，只保存在这台电脑上；导出备份时勾选「包含私密信息」才会带上。
                </span>
              )}
            </label>
          </>
        ) : (
          <>
            <p className="weather-account">
              <span>
                和风天气 · <span className="weather-host">{account?.host}</span>
              </span>
              <button type="button" className="btn" onClick={() => setEditing(true)}>
                更改 KEY
              </button>
            </p>
            <label className="field">
              <span>城市</span>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="例如：杭州、西湖、昆山"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={!!error}
                aria-describedby={error ? 'weather-error' : undefined}
              />
              {error && (
                <span className="field-error" id="weather-error">
                  {error}
                </span>
              )}
            </label>
            {results &&
              (results.length ? (
                <ul className="places">
                  {results.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="place"
                        onClick={() => {
                          onPick(p);
                          onClose();
                        }}
                      >
                        <span className="place-name">{p.name}</span>
                        <span className="place-region">{p.region}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="places-empty">没有找到这个城市，换个写法试试</p>
              ))}
          </>
        )}

        <footer className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            {editing ? '取消' : '完成'}
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy || (editing ? !host.trim() || !key.trim() : !text.trim())}>
            {busy ? (editing ? '验证中…' : '搜索中…') : editing ? '保存' : '搜索'}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}

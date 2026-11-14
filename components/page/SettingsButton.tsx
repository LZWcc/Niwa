import { useRef, useState, type ReactNode } from 'react';
import Dialog from '@/components/common/Dialog';
import EnginesDialog from '@/components/search/EnginesDialog';
import ExcludeDialog from '@/components/search/ExcludeDialog';
import { useEngines } from '@/hooks/useEngines';
import { usePermissions } from '@/hooks/usePermissions';
import { useStored, useStoredList, useStoredText } from '@/hooks/useStored';
import { useTheme } from '@/hooks/useTheme';
import { toUserMessage } from '@/utils/errors';
import { DEFAULT_SPOT, isPet, type Pet } from '@/utils/pet/model';
import { KEYS, readJson } from '@/utils/storage';
import type { ThemeChoice } from '@/utils/theme';
import { isWeatherAccount, type WeatherAccount } from '@/utils/weather';
import BackupDialog from './BackupDialog';

// 右上角的设置：散在各处的设置集中在这里（外观、搜索、小组件、宠物、数据）。
// 原来的地方（引擎菜单、各小组件的菜单、右上角的浅色 / 深色）照样能改，两边同步（useStoredText 等在页面里互相通知）。

const NOTIFY = ['notifications'];
const THEMES: [ThemeChoice, string][] = [
  ['system', '跟随系统'],
  ['light', '浅色'],
  ['dark', '深色'],
];

/** 一行设置：左边是名字和一句说明，右边是开关或按钮 */
function Row({ label, note, children }: { label: string; note?: ReactNode; children: ReactNode }) {
  return (
    <div className="setting">
      <span className="setting-label">
        {label}
        {note && <small>{note}</small>}
      </span>
      {children}
    </div>
  );
}

function Switch({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return <button type="button" role="switch" className="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />;
}

/** 几个里选一个 */
function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: [T, string][];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="choice" role="radiogroup" aria-label={label}>
      {options.map(([v, name]) => (
        <button key={v} type="button" role="radio" aria-checked={v === value} onClick={() => onChange(v)}>
          {name}
        </button>
      ))}
    </div>
  );
}

export default function SettingsButton() {
  const [open, setOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [excludeOpen, setExcludeOpen] = useState(false);
  // 清除天气 KEY 要点两次
  const [clearing, setClearing] = useState(false);

  const { choice, choose } = useTheme();
  const [enginesOpen, setEnginesOpen] = useState(false);
  const { engines, engine } = useEngines();
  const [suggest, setSuggest] = useStoredText(KEYS.searchSuggest);
  const [excluded, setExcluded] = useStoredList<string>(KEYS.searchExclude, (v): v is string => typeof v === 'string', []);
  const [scene, setScene] = useStoredText(KEYS.sceneWeather);
  const [account, setAccount] = useStored<WeatherAccount | null>(KEYS.weatherAccount, () =>
    readJson(KEYS.weatherAccount, isWeatherAccount),
  );
  const [notify, requestNotify, revokeNotify] = usePermissions(NOTIFY);
  const [pet, setPet] = useStored<Pet | null>(KEYS.pet, () => readJson(KEYS.pet, isPet));
  const [petError, setPetError] = useState('');
  const petInput = useRef<HTMLInputElement | null>(null);

  // 换一只时留在原来的位置。处理图片的代码点了才加载（没用宠物的人不加载）。
  const pickPet = async (files: File[]) => {
    setPetError('');
    try {
      const { importPet } = await import('@/utils/pet/sprite');
      const found = await importPet(files);
      setPet((p) => ({ ...found, ...(p ? { x: p.x, y: p.y } : DEFAULT_SPOT) }));
    } catch (error) {
      setPetError(toUserMessage(error, '导入宠物'));
    }
  };

  return (
    <>
      <button type="button" className="page-action" onClick={() => setOpen(true)} aria-label="设置" title="设置">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M2.5 4.5h7M12.5 4.5h1M2.5 11.5h1M6.5 11.5h7" />
          <circle cx="11" cy="4.5" r="1.6" />
          <circle cx="5" cy="11.5" r="1.6" />
        </svg>
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        className="dialog settings"
        labelledBy="settings-title"
        onOpen={() => {
          setClearing(false);
          setPetError('');
        }}
      >
        <div className="dialog-body">
          <h2 id="settings-title" className="dialog-title">
            设置
          </h2>

          <section className="settings-section">
            <h3>外观</h3>
            <Row label="浅色 / 深色" note="跟随系统时，系统切换深浅色这里也跟着换">
              <Choice label="浅色 / 深色" options={THEMES} value={choice} onChange={choose} />
            </Row>
          </section>

          <section className="settings-section">
            <h3>搜索</h3>
            <Row label="搜索引擎" note={`在用 ${engine.name}，共 ${engines.length} 个`}>
              <button type="button" className="btn" onClick={() => setEnginesOpen(true)}>
                管理…
              </button>
            </Row>
            <Row label="联想收藏和历史" note="打字时从收藏夹和浏览记录里找">
              <Switch label="联想收藏和历史" on={suggest !== 'off'} onChange={(on) => setSuggest(on ? null : 'off')} />
            </Row>
            <Row label="联想里排除的网站" note={excluded.length ? `${excluded.length} 个` : '没有'}>
              <button type="button" className="btn" onClick={() => setExcludeOpen(true)}>
                管理…
              </button>
            </Row>
          </section>

          <section className="settings-section">
            <h3>小组件</h3>
            <Row label="背景跟随天气" note="阴、雾、雨、雪时背景跟着变（要放一个天气小组件）">
              <Switch label="背景跟随天气" on={scene === 'on'} onChange={(on) => setScene(on ? 'on' : null)} />
            </Row>
            <Row label="和风天气 KEY" note={account ? account.host : '还没填，在天气小组件里设置'}>
              {account && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    if (!clearing) return setClearing(true);
                    setAccount(null);
                    setClearing(false);
                  }}
                >
                  {clearing ? '再点一次清除' : '清除'}
                </button>
              )}
            </Row>
            <Row label="计时器到点发系统通知" note="浏览器不在前台时也看得到（系统要允许 Edge 发通知）">
              <Switch label="计时器到点发系统通知" on={notify === true} onChange={(on) => (on ? requestNotify() : revokeNotify())} />
            </Row>
          </section>

          <section className="settings-section">
            <h3>宠物</h3>
            <Row
              label="宠物"
              note={
                petError ? (
                  <span className="field-error">{petError}</span>
                ) : pet ? (
                  `${pet.name}：拖动换位置，点一下打招呼`
                ) : (
                  '导入 Codex 的宠物：选 ~/.codex/pets/ 里的一个文件夹'
                )
              }
            >
              <span className="setting-buttons">
                {pet && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      setPet(null);
                      void import('@/utils/pet/sprite').then((m) => m.deletePetSprite());
                    }}
                  >
                    移除
                  </button>
                )}
                <button type="button" className="btn" onClick={() => petInput.current!.click()}>
                  {pet ? '换一只…' : '导入…'}
                </button>
              </span>
              <input
                ref={(el) => {
                  petInput.current = el;
                  // React 的类型里没有 webkitdirectory，选文件夹要在元素上设
                  if (el) el.webkitdirectory = true;
                }}
                type="file"
                hidden
                onChange={(e) => {
                  const files = [...e.target.files!];
                  e.target.value = '';
                  void pickPet(files);
                }}
              />
            </Row>
          </section>

          <section className="settings-section">
            <h3>数据</h3>
            <Row label="备份与恢复" note="导出成一个文件，在另一个浏览器里导入">
              <button type="button" className="btn" onClick={() => setBackupOpen(true)}>
                打开…
              </button>
            </Row>
          </section>

          <footer className="dialog-actions">
            <button type="button" className="btn btn-primary" onClick={() => setOpen(false)}>
              完成
            </button>
          </footer>
        </div>
      </Dialog>
      <EnginesDialog open={enginesOpen} onClose={() => setEnginesOpen(false)} />
      <ExcludeDialog open={excludeOpen} sites={excluded} onChange={setExcluded} onClose={() => setExcludeOpen(false)} />
      <BackupDialog open={backupOpen} onClose={() => setBackupOpen(false)} />
    </>
  );
}

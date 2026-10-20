import { useEffect, useRef, useState } from 'react';
import { useEngines } from '@/hooks/useEngines';
import { useStoredList, useStoredText } from '@/hooks/useStored';
import { useSuggestions } from '@/hooks/useSuggestions';
import { hostOf } from '@/utils/browsing';
import { requestPermissions } from '@/utils/permissions';
import { searchUrl } from '@/utils/search/template';
import { KEYS } from '@/utils/storage';
import EngineMark from './EngineMark';
import EnginesDialog from './EnginesDialog';
import ExcludeDialog from './ExcludeDialog';
import Suggestions from './Suggestions';

export default function Search() {
  // 上次选的引擎；没选过或找不到就用第一个。设置面板里也能换，两边同步。
  const { engines, engine, choose } = useEngines();
  const [enginesOpen, setEnginesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLDivElement>(null);

  // 联想：输入时在收藏夹和浏览记录里找；↓↑ 选、回车打开（⌘ / Ctrl 在新标签页），没选时回车照常搜索。
  // 引擎菜单里可以关掉联想、管理排除的网站。
  const [query, setQuery] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [active, setActive] = useState(-1);
  const [suggestSetting, setSuggestSetting] = useStoredText(KEYS.searchSuggest);
  const suggestOn = suggestSetting !== 'off';
  const [excluded, setExcluded] = useStoredList<string>(KEYS.searchExclude, (v): v is string => typeof v === 'string', []);
  const [excludeOpen, setExcludeOpen] = useState(false);
  const { result, refresh } = useSuggestions(suggesting && suggestOn ? query : '', excluded);
  const items = result?.items ?? [];
  const ask = !!result && !result.allowed;

  const turnSuggest = (on: boolean) => setSuggestSetting(on ? null : 'off');
  const shown = suggesting && (items.length > 0 || ask);

  const onQueryKey = (e: React.KeyboardEvent) => {
    if (!shown || e.nativeEvent.isComposing) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      // 从输入框往下走到第一条，走过最后一条回到输入框（-1）
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((a) => ((a + 1 + step + items.length + 1) % (items.length + 1)) - 1);
    } else if (e.key === 'Enter' && items[active]) {
      e.preventDefault();
      if (e.metaKey || e.ctrlKey) window.open(items[active].url);
      else location.href = items[active].url;
    } else if (e.key === 'Escape') {
      // 只收起联想，不清空输入框（搜索框默认按 Esc 会清空）
      e.preventDefault();
      setSuggesting(false);
    }
  };

  const pick = (id: string) => {
    choose(id);
    setMenuOpen(false);
    input.current?.focus();
  };

  // 页面任意处按 / 聚焦搜索框。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.activeElement instanceof HTMLInputElement) return;
      e.preventDefault();
      input.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 菜单打开时：聚焦当前项；点外面或按 Esc 关闭。
  useEffect(() => {
    if (!menuOpen) return;
    picker.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!picker.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setMenuOpen(false);
      picker.current?.querySelector<HTMLElement>('.engine-button')?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = [...(picker.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])];
    const at = items.indexOf(document.activeElement as HTMLElement);
    items[(at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  };

  // 搜索词放进引擎网址里 %s 的位置（有的在路径里，原生表单做不到）；空的时候 required 拦住，不会提交。
  return (
    <>
      <form
        className="search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          location.href = searchUrl(engine.url, input.current!.value);
        }}
      >
        <div className="engine" ref={picker}>
          <button
            type="button"
            className="engine-button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`搜索引擎：${engine.name}`}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <EngineMark engine={engine} />
            <svg className="engine-chevron" width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
              <path d="M1.5 3 4 5.5 6.5 3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
          {menuOpen && (
            <div className="engine-menu" role="menu" aria-label="选择搜索引擎" onKeyDown={onMenuKey}>
              {engines.map((e) => (
                <button key={e.id} type="button" role="menuitemradio" aria-checked={e.id === engine.id} onClick={() => pick(e.id)}>
                  <EngineMark engine={e} />
                  <span>{e.name}</span>
                  <svg className="engine-check" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                    <path
                      d="M2.5 6.2 5 8.5l4.5-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ))}
              <div className="engine-sep" role="separator" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setEnginesOpen(true);
                }}
              >
                <span>管理搜索引擎…</span>
              </button>
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={suggestOn}
                onClick={() => {
                  turnSuggest(!suggestOn);
                  setMenuOpen(false);
                }}
              >
                <span>联想收藏和历史</span>
                <svg className="engine-check" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <path
                    d="M2.5 6.2 5 8.5l4.5-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setExcludeOpen(true);
                }}
              >
                <span>排除的网站…</span>
              </button>
            </div>
          )}
        </div>
        <label className="sr-only" htmlFor="search-query">
          使用 {engine.name} 搜索
        </label>
        <input
          ref={input}
          id="search-query"
          type="search"
          placeholder={`在 ${engine.name} 中搜索`}
          autoComplete="off"
          autoFocus
          required
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={shown}
          aria-controls="search-suggestions"
          aria-activedescendant={shown && items[active] ? `search-option-${active}` : undefined}
          onChange={(e) => {
            setQuery(e.target.value);
            setSuggesting(true);
            setActive(-1);
          }}
          onKeyDown={onQueryKey}
          onBlur={() => setSuggesting(false)}
        />
        {shown && (
          <Suggestions
            items={items}
            active={active}
            ask={ask}
            onHover={setActive}
            onExclude={(url) => {
              setExcluded((list) => [...list, hostOf(url)]);
              setActive(-1);
            }}
            onAllow={() => void requestPermissions(['bookmarks', 'history']).then(refresh)}
            onDismiss={() => turnSuggest(false)}
          />
        )}
      </form>
      <EnginesDialog open={enginesOpen} onClose={() => setEnginesOpen(false)} />
      <ExcludeDialog open={excludeOpen} sites={excluded} onChange={setExcluded} onClose={() => setExcludeOpen(false)} />
    </>
  );
}

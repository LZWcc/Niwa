import { useEffect, useRef, useState } from 'react';
import { SEARCH_ENGINES as engines, type SearchEngine } from '@/config';
import { KEYS } from '@/utils/storage';

// 固定宽度的圆形标记，引擎名长短不影响布局。
function Mark({ engine }: { engine: SearchEngine }) {
  return (
    <span
      className="engine-mark"
      style={{ '--mark': engine.color, '--icon': `url(/engines/${engine.icon}.svg)` } as React.CSSProperties}
      aria-hidden="true"
    />
  );
}

export default function Search() {
  // 上次选的引擎；没选过或找不到就用第一个。
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      engines.findIndex((e) => e.name === localStorage.getItem(KEYS.engine)),
    ),
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLDivElement>(null);
  const engine = engines[index]!;

  const choose = (next: number) => {
    setIndex(next);
    setMenuOpen(false);
    localStorage.setItem(KEYS.engine, engines[next]!.name);
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
    const items = [...(picker.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])];
    const at = items.indexOf(document.activeElement as HTMLElement);
    items[(at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  };

  // 原生表单提交，搜索不依赖 React 状态。
  return (
    <form className="search" action={engine.action} method="get" role="search">
      <div className="engine" ref={picker}>
        <button
          type="button"
          className="engine-button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`搜索引擎：${engine.name}`}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Mark engine={engine} />
          <svg className="engine-chevron" width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
            <path d="M1.5 3 4 5.5 6.5 3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
        {menuOpen && (
          <div className="engine-menu" role="menu" aria-label="选择搜索引擎" onKeyDown={onMenuKey}>
            {engines.map((e, i) => (
              <button key={e.name} type="button" role="menuitemradio" aria-checked={i === index} onClick={() => choose(i)}>
                <Mark engine={e} />
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
        name={engine.param}
        placeholder={`在 ${engine.name} 中搜索`}
        autoComplete="off"
        autoFocus
        required
      />
    </form>
  );
}

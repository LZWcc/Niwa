type Props = { label: string; query: string | null; onChange: (query: string | null) => void };

// 收藏夹、历史标题栏右侧的搜索：query 为 null 时是放大镜按钮，点开后搜索框顶替标题栏，Esc 或 × 收起并清空。
export default function LinksSearch({ label, query, onChange }: Props) {
  if (query === null) {
    return (
      <button type="button" className="links-icon-button" aria-label={label} title={label} onClick={() => onChange('')}>
        <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
          <circle cx="5.5" cy="5.5" r="4" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8.5 8.5L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
    );
  }
  return (
    <>
      <input
        className="links-search"
        value={query}
        placeholder={label}
        aria-label={label}
        autoFocus
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onChange(null);
        }}
      />
      <button type="button" className="links-icon-button" aria-label="关闭搜索" onClick={() => onChange(null)}>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
    </>
  );
}

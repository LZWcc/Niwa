import { useTheme } from '@/hooks/useTheme';

// 右上角：在浅色「山水」和深色「夜庭」之间切换。图标画的是点下去会变成的样子。
export default function ThemeToggle() {
  const { theme, choice, toggle } = useTheme();
  const next = theme === 'dark' ? '浅色' : '深色';
  const title = `切换到${next}${choice === 'system' ? '（当前跟随系统）' : ''}`;
  return (
    <button type="button" className="page-action theme-toggle" onClick={toggle} aria-label={title} title={title}>
      {theme === 'dark' ? (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="3.2" />
          <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.4 1.4M11.55 11.55l1.4 1.4M3.05 12.95l1.4-1.4M11.55 4.45l1.4-1.4" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M13.5 9.6A5.6 5.6 0 0 1 6.4 2.5a5.6 5.6 0 1 0 7.1 7.1z" />
        </svg>
      )}
    </button>
  );
}

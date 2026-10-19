// 图标的画面（和 docs/images/icon.svg 同一套山和日），片头里太阳从山后升起，再收成图标。
/** lift：远山、近山往下沉多少（viewBox 单位），片头里山从下面升起来，远山慢一些 */
type Props = { size: number; radius: number; sun: number; shadow?: number; lift?: number };

export default function Logo({ size, radius, sun, shadow = 0, lift = 0 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      style={{ display: 'block', filter: shadow ? `drop-shadow(0 ${shadow}px ${shadow * 2}px rgb(40 60 80 / 0.25))` : undefined }}
    >
      <defs>
        <linearGradient id="logo-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9e4d8" />
          <stop offset="1" stopColor="#f4f1ea" />
        </linearGradient>
        <linearGradient id="logo-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fa2ae" />
          <stop offset="1" stopColor="#8fa2ae" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="logo-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#26313b" />
          <stop offset="1" stopColor="#26313b" stopOpacity="0.15" />
        </linearGradient>
        <clipPath id="logo-clip">
          <rect width="128" height="128" rx={radius} />
        </clipPath>
      </defs>
      <g clipPath="url(#logo-clip)">
        <rect width="128" height="128" fill="url(#logo-sky)" />
        <circle cx="88" cy={sun} r="15" fill="#d9573f" />
        <path
          transform={`translate(0 ${lift * 0.6})`}
          d="M0 84 C14 70 24 50 38 46 C50 43 56 62 66 66 C78 70 88 58 100 62 C112 66 120 76 128 80 L128 112 L0 112 Z"
          fill="url(#logo-far)"
        />
        <path
          transform={`translate(0 ${lift})`}
          d="M0 104 C10 96 18 76 32 72 C44 69 50 88 58 94 C64 98 70 92 78 90 C92 86 108 100 128 104 L128 128 L0 128 Z"
          fill="url(#logo-near)"
        />
      </g>
    </svg>
  );
}

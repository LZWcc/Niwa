// 背景里的景：浅色是远山与薄雾（山色随季节变），深色是月夜。
// 颜色全部来自 CSS 变量，切换深浅色和季节不需要重绘。
export default function Scene() {
  return (
    <div className="scene" aria-hidden="true">
      <div className="scene-sky">
        <div className="scene-orb" />
      </div>
      <div className="scene-land">
        <svg className="scene-hills" viewBox="0 0 1440 420" preserveAspectRatio="none">
          <defs>
            <linearGradient id="scene-mist" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="var(--mist)" stopOpacity=".9" />
              <stop offset="1" stopColor="var(--mist)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            fill="var(--hill-far)"
            d="M0 250C120 190 220 140 340 160C460 180 520 110 640 100C760 90 840 170 960 160C1080 150 1180 80 1300 110C1380 130 1420 160 1440 170V420H0Z"
          />
          <rect y="150" width="1440" height="140" fill="url(#scene-mist)" />
          <path
            fill="var(--hill-mid)"
            d="M0 300C140 250 260 230 380 260C500 290 600 210 720 222C860 236 940 296 1080 276C1200 258 1320 226 1440 246V420H0Z"
          />
          <rect y="230" width="1440" height="110" fill="url(#scene-mist)" />
          <path fill="var(--hill-near)" d="M0 360C180 330 300 338 460 352C620 366 760 326 900 334C1060 344 1240 362 1440 344V420H0Z" />
        </svg>
      </div>
    </div>
  );
}

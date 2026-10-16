import React from 'react';
import ReactDOM from 'react-dom/client';
import { browser } from 'wxt/browser';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { applyAtmosphere } from '@/utils/almanac';
import { reportError } from '@/utils/errors';
import { preview } from '@/utils/preview';
import { applyTheme, readThemeChoice, systemTheme } from '@/utils/theme';
import { applySceneWeather } from '@/utils/weather';
import App from './App';
import './styles/index.css';

// 扩展更新或重新加载后，之前打开的新标签页就和扩展断开了（Extension context invalidated）：
// 收藏、历史、权限这些接口都用不了，每分钟的刷新都会报错。断开后不再记录这些错误，回到这个标签页时重新加载成新版本。
// 只看一开始就在扩展里运行的页面（页面测试不在扩展里，本来就没有 runtime.id）。
const inExtension = !!browser.runtime?.id;
const detached = () => inExtension && !browser.runtime?.id;
addEventListener('visibilitychange', () => {
  if (!document.hidden && detached()) location.reload();
});

// 没有被哪里处理的错误（事件处理里抛的、没人接的 Promise 失败）都在这里统一记录。
addEventListener('error', (e) => {
  if (!detached()) reportError(e.error, '未捕获的错误');
});
addEventListener('unhandledrejection', (e) => {
  if (detached()) e.preventDefault();
  else reportError(e.reason, '未处理的 Promise 失败');
});

// 首帧前写好浅色 / 深色和季节、时辰，避免颜色闪变。
const choice = readThemeChoice();
applyTheme(choice === 'system' ? systemTheme() : choice);
applyAtmosphere(new Date(), preview);
// 平时背景的天气由天气小组件写（它有数据）；这里只管开发时的预览参数。
applySceneWeather(preview.weather);

const pageError = (
  <main className="page-error" role="alert">
    <p>页面出错了</p>
    <button type="button" className="btn" onClick={() => location.reload()}>
      重新加载
    </button>
  </main>
);

ReactDOM.createRoot(document.getElementById('root')!, {
  // 被 ErrorBoundary 接住的渲染错误：界面已经换成 fallback，这里负责记录。
  onCaughtError: (error) => reportError(error, '渲染'),
}).render(
  <React.StrictMode>
    <ErrorBoundary fallback={() => pageError}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

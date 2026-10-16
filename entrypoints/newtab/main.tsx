import React from 'react';
import ReactDOM from 'react-dom/client';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { applyAtmosphere } from '@/utils/almanac';
import { reportError } from '@/utils/errors';
import { preview } from '@/utils/preview';
import { applyTheme, readThemeChoice, systemTheme } from '@/utils/theme';
import App from './App';
import './styles/index.css';

// 没有被哪里处理的错误（事件处理里抛的、没人接的 Promise 失败）都在这里统一记录。
addEventListener('error', (e) => reportError(e.error, '未捕获的错误'));
addEventListener('unhandledrejection', (e) => reportError(e.reason, '未处理的 Promise 失败'));

// 首帧前写好浅色 / 深色和季节、时辰，避免颜色闪变。
const choice = readThemeChoice();
applyTheme(choice === 'system' ? systemTheme() : choice);
applyAtmosphere(new Date(), preview);

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

import React from 'react';
import ReactDOM from 'react-dom/client';
import { applyTheme, readThemeChoice, systemTheme } from '@/utils/theme';
import App from './App';
import '../newtab/styles/tokens.css';
import '../newtab/styles/base.css';
import '../newtab/styles/dialog.css';
import './alarm.css';

// 计时器到点时，后台脚本弹出的提醒小窗（entrypoints/background.ts）。
const choice = readThemeChoice();
applyTheme(choice === 'system' ? systemTheme() : choice);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

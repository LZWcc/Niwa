import { useEffect, useState } from 'react';
import { KEYS } from '@/utils/storage';
import { applyTheme, isThemeChoice, switchTheme, systemDark, systemTheme, type Theme, type ThemeChoice } from '@/utils/theme';
import { useStoredText } from './useStored';

/**
 * 当前的浅色 / 深色，和切换它的 toggle。
 * 切到和系统相同的那一种时回到“跟随系统”，这样平时只需要一个按钮：
 * 想固定就点一下，再点回来就又跟着系统走了。
 * 点按钮切换时有日落月升的过渡；跟随系统或其他标签页的变化直接换。
 * 设置面板里可以直接选三种之一（choose），和右上角的按钮同步。
 */
export function useTheme() {
  const [saved, setSaved] = useStoredText(KEYS.theme);
  const choice: ThemeChoice = isThemeChoice(saved) ? saved : 'system';
  // 只用来在系统切换时重新渲染。
  const [system, setSystem] = useState(systemTheme);
  const theme = choice === 'system' ? system : choice;

  useEffect(() => applyTheme(theme), [theme]);

  useEffect(() => {
    const onChange = () => setSystem(systemTheme());
    systemDark.addEventListener('change', onChange);
    return () => systemDark.removeEventListener('change', onChange);
  }, []);

  /** 换成这一种选择；看起来会变时带日落月升 */
  const choose = (nextChoice: ThemeChoice) => {
    const next: Theme = nextChoice === 'system' ? systemTheme() : nextChoice;
    if (next === theme) setSaved(nextChoice);
    else switchTheme(next, () => setSaved(nextChoice));
  };

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    choose(next === systemTheme() ? 'system' : next);
  };

  return { theme, choice, toggle, choose };
}

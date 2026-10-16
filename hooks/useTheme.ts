import { useEffect, useState } from 'react';
import { KEYS } from '@/utils/storage';
import { applyTheme, readThemeChoice, switchTheme, systemDark, systemTheme, type ThemeChoice } from '@/utils/theme';

/**
 * 当前的浅色 / 深色，和切换它的 toggle。
 * 切到和系统相同的那一种时回到“跟随系统”，这样平时只需要一个按钮：
 * 想固定就点一下，再点回来就又跟着系统走了。
 * 点按钮切换时有日落月升的过渡；跟随系统或其他标签页的变化直接换。
 */
export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(readThemeChoice);
  // 只用来在系统切换时重新渲染。
  const [system, setSystem] = useState(systemTheme);
  const theme = choice === 'system' ? system : choice;

  useEffect(() => applyTheme(theme), [theme]);

  useEffect(() => {
    const onChange = () => setSystem(systemTheme());
    systemDark.addEventListener('change', onChange);
    return () => systemDark.removeEventListener('change', onChange);
  }, []);

  // 另一个新标签页里切换了，这里跟着变。
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEYS.theme) setChoice(readThemeChoice());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    const nextChoice: ThemeChoice = next === systemTheme() ? 'system' : next;
    switchTheme(next, () => {
      setChoice(nextChoice);
      localStorage.setItem(KEYS.theme, nextChoice);
    });
  };

  return { theme, choice, toggle };
}

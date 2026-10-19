import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
import { readList, type StorageKey } from '@/utils/storage';

// 同一个页面里，别的组件改了同一个键（例如设置面板和搜索框都管着“联想”），这里也要跟着变：
// storage 事件只在别的标签页改时才有，页面里自己改的，用这个事件通知。
const CHANGED = 'niwa:stored';

const notify = (key: StorageKey) => window.dispatchEvent(new CustomEvent(CHANGED, { detail: key }));

/** 这个键被别处（别的标签页、这个页面里的别的组件）改了时调用 onChange */
function useChanged(key: StorageKey, onChange: () => void) {
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) onChange();
    };
    const onChanged = (e: Event) => {
      if ((e as CustomEvent<string>).detail === key) onChange();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(CHANGED, onChanged);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CHANGED, onChanged);
    };
    // onChange 只依赖 key 和模块级的校验函数，按 key 重新订阅即可。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

/**
 * 存在 localStorage 里的一份数据（JSON）。同步读取，首帧就有数据、不闪；改的时候当场写回去（不等渲染完再用 effect 写）；
 * 别的标签页、这个页面里的别的组件改了，这里都跟着变。read 负责读出并校验。
 * 只在内容真的变了时才写、才通知：收到通知后读回来的一样，就不会来回通知个不停。
 * 改法和 useState 一样，可以传函数；函数拿到的是最新的值（同一次点击里连着改几次也不会用旧值）。
 */
export function useStored<T>(key: StorageKey, read: () => T) {
  const [value, setValue] = useState(read);
  const latest = useRef(value);

  const set = useCallback(
    (next: SetStateAction<T>) => {
      const v = next instanceof Function ? next(latest.current) : next;
      latest.current = v;
      setValue(v);
      const text = JSON.stringify(v);
      if (localStorage.getItem(key) === text) return;
      localStorage.setItem(key, text);
      notify(key);
    },
    [key],
  );

  useChanged(key, () => {
    latest.current = read();
    setValue(latest.current);
  });

  return [value, set] as const;
}

/** 存在 localStorage 里的列表：校验不过的项丢掉，没有存过时用 fallback。 */
export function useStoredList<T>(key: StorageKey, isItem: (v: unknown) => v is T, fallback: T[]) {
  return useStored(key, () => readList(key, isItem, fallback));
}

/** 存成一段文字的设置（搜索引擎名、开关之类），null 是没设过。和 useStored 一样在页面里、标签页之间同步。 */
export function useStoredText(key: StorageKey) {
  const [value, setValue] = useState(() => localStorage.getItem(key));
  useChanged(key, () => setValue(localStorage.getItem(key)));
  const set = (next: string | null) => {
    if (next === null) localStorage.removeItem(key);
    else localStorage.setItem(key, next);
    setValue(next);
    notify(key);
  };
  return [value, set] as const;
}

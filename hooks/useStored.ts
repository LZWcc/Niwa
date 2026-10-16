import { useEffect, useState } from 'react';
import { readList, writeJson, type StorageKey } from '@/utils/storage';

/**
 * 存在 localStorage 里的一份数据。同步读取，首帧就有数据、不闪；改了就写回去；
 * 另一个新标签页里改了，这里通过 storage 事件同步过来。read 负责读出并校验。
 */
export function useStored<T>(key: StorageKey, read: () => T) {
  const [value, setValue] = useState(read);

  useEffect(() => writeJson(key, value), [key, value]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) setValue(read());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
    // read 只依赖 key 和模块级的校验函数，按 key 重新订阅即可。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [value, setValue] as const;
}

/** 存在 localStorage 里的列表：校验不过的项丢掉，没有存过时用 fallback。 */
export function useStoredList<T>(key: StorageKey, isItem: (v: unknown) => v is T, fallback: T[]) {
  return useStored(key, () => readList(key, isItem, fallback));
}

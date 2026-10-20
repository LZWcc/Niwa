import { DEFAULT_ENGINES, isEngine } from '@/utils/search/engines';
import { KEYS } from '@/utils/storage';
import { useStoredList, useStoredText } from './useStored';

// 搜索引擎列表和选中的那个（按 id 记；没选过或已经移除了就用第一个）。搜索框、设置面板、管理对话框都用它，改了互相同步。
export function useEngines() {
  const [engines, setEngines] = useStoredList(KEYS.engines, isEngine, DEFAULT_ENGINES);
  const [chosen, choose] = useStoredText(KEYS.engine);
  const engine = engines.find((e) => e.id === chosen) ?? engines[0]!;
  return { engines, setEngines, engine, choose };
}

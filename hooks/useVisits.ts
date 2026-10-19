import { useEffect, useState } from 'react';
import { dayKey } from '@/utils/date';
import { sampleVisits } from '@/utils/sample';
import { recordVisit } from '@/utils/visits';
import { useSample } from './useSample';

/** 记下今天打开过（跨过午夜也会再记一次），返回累计情况和今天的日期键。预览里不记，用演示的天数。 */
export function useVisits(now: Date) {
  const sample = useSample();
  const today = dayKey(now);
  const [visits, setVisits] = useState(() => (sample ? sampleVisits(now) : recordVisit(today)));
  // 页面开着跨过了午夜（now 变了）：再记一次。刚打开时初始值已经记过，不再多渲染一遍。
  useEffect(() => {
    if (!sample && visits.last !== today) setVisits(recordVisit(today));
  }, [today, sample, visits.last]);
  return { visits, today };
}

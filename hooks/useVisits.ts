import { useEffect, useState } from 'react';
import { dayKey } from '@/utils/date';
import { recordVisit } from '@/utils/visits';

/** 记下今天打开过（跨过午夜也会再记一次），返回累计情况和今天的日期键。 */
export function useVisits(now: Date) {
  const today = dayKey(now);
  const [visits, setVisits] = useState(() => recordVisit(today));
  useEffect(() => setVisits(recordVisit(today)), [today]);
  return { visits, today };
}

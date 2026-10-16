// 记录“打开过几天”。只算累计天数，不算连续——断了也不惩罚。
import { KEYS, readJson, writeJson } from './storage';

export type Visits = { first: string; last: string; days: number };

export const isVisits = (v: unknown): v is Visits => {
  const visits = v as Visits | null;
  return typeof visits?.days === 'number' && typeof visits.first === 'string' && typeof visits.last === 'string';
};

/** 记下今天打开过。同一天重复调用是幂等的。 */
export function recordVisit(today: string): Visits {
  const saved = readJson(KEYS.visits, isVisits);
  const visits = !saved
    ? { first: today, last: today, days: 1 }
    : saved.last === today
      ? saved
      : { ...saved, last: today, days: saved.days + 1 };
  writeJson(KEYS.visits, visits);
  return visits;
}

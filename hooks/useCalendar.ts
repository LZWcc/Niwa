import { useEffect, useRef, useState } from 'react';
import { CALENDAR } from '@/config';
import { deleteCalendarFile, saveCalendarFile } from '@/utils/calendar/files';
import {
  byStart,
  calendarName,
  fetchCalendar,
  isCalendarSource,
  isFileSource,
  type CalendarEvent,
  type CalendarSource,
} from '@/utils/calendar/ical';
import { startOfDay } from '@/utils/date';
import { toUserMessage } from '@/utils/errors';
import { KEYS, readJson, writeJson } from '@/utils/storage';
import { useStoredList } from './useStored';

/** failed：这次没更新成功的日历，和给用户看的原因 */
type Cache = { key: string; fetchedAt: number; events: CalendarEvent[]; failed: { id: string; message: string }[] };

const isCache = (v: unknown): v is Cache => Array.isArray((v as Cache | null)?.events);
const readCache = () => readJson(KEYS.calendarCache, isCache);

/**
 * 日程数据：先用本地缓存立即显示，过期（15 分钟，失败后 2 分钟）再在后台刷新。
 * now 每分钟和页面重新可见时都会变，借此检查是否需要刷新，不另设定时器。
 */
export function useCalendar(now: Date) {
  const [sources, setSources] = useStoredList(KEYS.calendars, isCalendarSource, []);
  const [cache, setCache] = useState(readCache);
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);
  const key = sources.map((s) => s.url).join('|');

  const refresh = async () => {
    if (busy.current || sources.length === 0) return;
    busy.current = true;
    setLoading(true);

    const from = startOfDay(Date.now());
    const results = await Promise.allSettled(sources.map((s) => fetchCalendar(s, from, CALENDAR.days)));

    const previous = readCache();
    const events: CalendarEvent[] = [];
    const failed: Cache['failed'] = [];
    const names = new Map<string, string>();
    results.forEach((result, i) => {
      const source = sources[i]!;
      if (result.status === 'fulfilled') {
        events.push(...result.value.events);
        if (result.value.name && result.value.name !== source.name) names.set(source.id, result.value.name);
      } else {
        // 失败的日历保留上一次的数据。
        failed.push({ id: source.id, message: toUserMessage(result.reason, `更新日历 ${source.url}`) });
        if (previous?.key === key) events.push(...previous.events.filter((e) => e.source === source.id));
      }
    });

    // 名称取自日历本身（X-WR-CALNAME），例如“工作”“个人”。
    if (names.size) setSources((list) => list.map((s) => (names.has(s.id) ? { ...s, name: names.get(s.id)! } : s)));

    const next: Cache = { key, fetchedAt: Date.now(), events, failed };
    writeJson(KEYS.calendarCache, next);
    setCache(next);
    busy.current = false;
    setLoading(false);
  };

  useEffect(() => {
    if (sources.length === 0) return;
    const age = cache?.key === key ? Date.now() - cache.fetchedAt : Infinity;
    if (age > (cache?.failed.length ? CALENDAR.retryAfter : CALENDAR.refreshEvery)) void refresh();
    // 每分钟（now 变）和日历列表变了（key 变）时检查一次是否该刷新；其余都是这次渲染里的值。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, key]);

  /**
   * 导入几个 .ics 文件：先解析确认是日历；和已经导入的同名时替换内容（换一个 url，缓存跟着失效），否则新加一个。
   * 返回导入了的日历 id，和没导入的文件各自的原因。
   */
  const importFiles = async (files: File[]) => {
    const imported = new Map<string, CalendarSource>();
    const problems: string[] = [];
    for (const file of files) {
      if (file.size > CALENDAR.maxFileSize) {
        problems.push(`${file.name} 超过 ${CALENDAR.maxFileSize / 1024 / 1024} MB，导出时可以只选一段时间`);
        continue;
      }
      try {
        const text = await file.text();
        const name = (await calendarName(text)) ?? file.name.replace(/\.ics$/i, '');
        const same = [...imported.values(), ...sources].find((s) => isFileSource(s) && s.name === name);
        const color = same?.color ?? CALENDAR.colors[(sources.length + imported.size) % CALENDAR.colors.length]!;
        const source = { id: same?.id ?? crypto.randomUUID(), url: `file:${crypto.randomUUID()}`, name, color };
        await saveCalendarFile(source.id, text);
        imported.set(source.id, source);
      } catch (error) {
        problems.push(`${file.name}：${toUserMessage(error, `导入日历文件 ${file.name}`)}`);
      }
    }
    setSources((list) => [
      ...list.map((s) => imported.get(s.id) ?? s),
      ...[...imported.values()].filter((i) => !list.some((s) => s.id === i.id)),
    ]);
    return { imported: [...imported.keys()], problems };
  };

  /** 移除一个日历；导入的文件一起删掉 */
  const removeSource = (source: CalendarSource) => {
    setSources((list) => list.filter((s) => s.id !== source.id));
    if (isFileSource(source)) void deleteCalendarFile(source.id);
  };

  const current = cache?.key === key ? cache : null;
  const events = (current?.events ?? []).filter((e) => e.end > now.getTime()).sort(byStart);

  return {
    sources,
    setSources,
    importFiles,
    removeSource,
    events,
    loading,
    failed: current?.failed ?? [],
    fetchedAt: current?.fetchedAt ?? null,
    refresh,
  };
}

/** useCalendar 的返回值：日历列表、日程、加载状态和刷新方法。 */
export type CalendarState = ReturnType<typeof useCalendar>;

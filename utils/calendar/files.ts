// 导入的日历文件（.ics）存在 IndexedDB 里：整份导出的日历可能有几 MB，localStorage（约 5MB，还要和别的数据共用）放不下。
// 日历列表（niwa:calendars）里这种日历的 url 是 file:<随机串>（每次导入换一个），内容按日历的 id 存在这里。只有这一种数据用 IndexedDB。

const DB = 'niwa';
const STORE = 'calendar-files';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** 在一个事务里做完 work，事务提交后返回最后那个请求的结果 */
async function transact<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = work(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = tx.onabort = () => reject(tx.error);
  }).finally(() => db.close());
}

/** 一个日历文件的内容；没有（比如在别的浏览器里导入的）时是 undefined */
export const readCalendarFile = (id: string) => transact<string | undefined>('readonly', (store) => store.get(id));

export const saveCalendarFile = (id: string, text: string) => transact('readwrite', (store) => store.put(text, id));

export const deleteCalendarFile = (id: string) => transact('readwrite', (store) => store.delete(id));

/** 这几个日历的文件（备份用）：id → 内容，没有的不带 */
export async function readCalendarFiles(ids: string[]): Promise<Record<string, string>> {
  const texts = await Promise.all(ids.map(readCalendarFile));
  return Object.fromEntries(ids.flatMap((id, i) => (texts[i] === undefined ? [] : [[id, texts[i]]])));
}

/** 用备份里的文件整体替换 */
export const replaceCalendarFiles = (files: Record<string, string>) =>
  transact('readwrite', (store) => {
    const cleared = store.clear();
    for (const [id, text] of Object.entries(files)) store.put(text, id);
    return cleared;
  });

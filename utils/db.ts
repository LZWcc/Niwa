// IndexedDB：放 localStorage（约 5MB，还要和别的数据共用）放不下的大块数据。现在有两种：导入的日历文件（calendar/files.ts）、宠物的图片（pet.ts）。
// 每种一个对象仓库。加仓库时把 VERSION 加一，升级时只补上还没有的仓库，老用户库里已有的数据不动。

const DB = 'niwa';
const VERSION = 2;

export const STORES = { calendarFiles: 'calendar-files', pet: 'pet' } as const;
type Store = (typeof STORES)[keyof typeof STORES];

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, VERSION);
    request.onupgradeneeded = () => {
      for (const name of Object.values(STORES)) {
        if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** 在 store 的一个事务里做完 work，事务提交后返回最后那个请求的结果 */
export async function transact<T>(store: Store, mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const request = work(tx.objectStore(store));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = tx.onabort = () => reject(tx.error);
  }).finally(() => db.close());
}

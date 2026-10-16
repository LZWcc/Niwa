// 可选权限按需申请：访问网站（optional_host_permissions，读日历、获取网站图标），
// 读取浏览器数据（optional_permissions，收藏夹、历史记录）。
// 不在扩展里运行时（页面测试）没有这个接口，直接放行。

type Request = { origins?: string[]; permissions?: string[] };
type Listener = { addListener: (f: () => void) => void; removeListener: (f: () => void) => void };
type Permissions = {
  contains: (p: Request) => Promise<boolean>;
  request: (p: Request) => Promise<boolean>;
  remove: (p: Request) => Promise<boolean>;
  onAdded: Listener;
  onRemoved: Listener;
};
const permissions = (globalThis as { chrome?: { permissions?: Permissions } }).chrome?.permissions;

const has = (p: Request) => permissions?.contains(p) ?? Promise.resolve(true);
// 浏览器只允许在点击事件里直接调用。
const request = (p: Request) => permissions?.request(p) ?? Promise.resolve(true);

export const hasOrigins = (origins: string[]) => has({ origins });

/** 申请访问这些网站。浏览器只允许在点击事件里直接调用。 */
export const requestOrigins = (origins: string[]) => request({ origins });

export const hasPermissions = (list: string[]) => has({ permissions: list });

/** 申请这些权限（例如 bookmarks、history）。浏览器只允许在点击事件里直接调用。 */
export const requestPermissions = (list: string[]) => request({ permissions: list });

/** 权限给了或收回时调用 onChange（哪里改的都算）；返回取消订阅的函数 */
export function onPermissionsChange(onChange: () => void) {
  permissions?.onAdded.addListener(onChange);
  permissions?.onRemoved.addListener(onChange);
  return () => {
    permissions?.onAdded.removeListener(onChange);
    permissions?.onRemoved.removeListener(onChange);
  };
}

/** 不要这些权限了（例如关掉计时器的通知） */
export const removePermissions = (list: string[]) => permissions?.remove({ permissions: list }) ?? Promise.resolve(true);

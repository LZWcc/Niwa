// 可选的网站访问权限（manifest 的 optional_host_permissions）：读日历、获取网站图标时按需申请。
// 不在扩展里运行时（页面测试）没有这个接口，直接放行。

type Permissions = {
  contains: (p: { origins: string[] }) => Promise<boolean>;
  request: (p: { origins: string[] }) => Promise<boolean>;
};
const permissions = (globalThis as { chrome?: { permissions?: Permissions } }).chrome?.permissions;

export const hasOrigins = (origins: string[]) => permissions?.contains({ origins }) ?? Promise.resolve(true);

/** 申请访问这些网站。浏览器只允许在点击事件里直接调用。 */
export const requestOrigins = (origins: string[]) => permissions?.request({ origins }) ?? Promise.resolve(true);

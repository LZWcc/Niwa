import { browser, type Browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { TIMER_ALARM } from '@/utils/timer';
import { showToast } from '@/utils/toast';

// 后台只做一件事：计时器的闹钟到点时提醒，新标签页关了也能收到。
// - 正看着新标签页：页面上的计时器自己会显示时间到、响一声，这里什么都不做；
// - 看着别的网页：把一张通知卡片放进那个网页（utils/toast.ts），像 macOS 的通知一样从右边滑进来，往右一划就消失；
//   要有访问那个网站的权限（optional_host_permissions，自动获取网站图标时给过），edge:// 页面、扩展商店、PDF 这些放不进去；
// - 放不进去、或者浏览器不在前台：在浏览器窗口的右上角弹一个提醒小窗（alarm.html），几秒后自己关掉；
// - 有通知权限（第一次开始倒计时时申请，菜单里可以开关）时再发一条系统通知，浏览器不在前台时也看得到。
//   系统通知只是附加的：系统可能不让它显示（比如 macOS 里没允许 Edge 发通知），浏览器又没法知道它显示了没有。

/** 把通知卡片放进这个标签页；放不进去（没权限、浏览器自己的页面）返回 false */
const showInPage = (tab: Browser.tabs.Tab | undefined, message: string) =>
  tab?.id === undefined
    ? Promise.resolve(false)
    : browser.scripting.executeScript({ target: { tabId: tab.id }, func: showToast, args: [message] }).then(
        () => true,
        () => false,
      );

export default defineBackground(() => {
  browser.alarms.onAlarm.addListener(async (alarm) => {
    const [kind, id, message] = alarm.name.split('|');
    if (kind !== TIMER_ALARM) return;
    // Mac 上浏览器窗口都关了、程序还开着时没有“最近用的窗口”，会抛错：当作没在看
    const current = await browser.windows.getLastFocused({ populate: true }).catch(() => null);
    const tab = current?.tabs?.find((t) => t.active);
    const onNewTab = [tab?.url, tab?.pendingUrl].some((url) => url && /^(edge|chrome):\/\/newtab\/|\/newtab\.html/.test(url));
    if (current?.focused && onNewTab) return;

    void browser.notifications?.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('/icon/128.png'),
      title: '时间到',
      message: message!,
      priority: 2,
    });
    if (current?.focused && (await showInPage(tab, message!))) return;

    // 后台拿不到屏幕大小，按最近用的浏览器窗口定位：放在它的右上角
    const width = 340;
    void browser.windows.create({
      url: `${browser.runtime.getURL('/alarm.html')}?${new URLSearchParams({ id: id!, message: message! })}`,
      type: 'popup',
      width,
      height: 200,
      left: (current?.left ?? 0) + (current?.width ?? width) - width - 16,
      top: (current?.top ?? 0) + 72,
      focused: true,
    });
  });
  // 点一下通知就收起来
  browser.notifications?.onClicked.addListener((id) => void browser.notifications.clear(id));
});

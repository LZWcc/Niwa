import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Niwa',
    description: '一方安静的新标签页',
    // 新标签页从浏览器本地缓存读取网站图标，不请求远程服务；计时器用闹钟在后台到点提醒（没有安装提示）。
    permissions: ['favicon', 'alarms'],
    // 读取日历的 iCal 订阅地址、获取网站图标时，按需申请对应网站的访问权限。
    optional_host_permissions: ['https://*/*'],
    // 收藏夹、历史小组件添加后点一下才申请；最近关闭的标签页要 tabs 权限才有网址和标题；计时器的通知在菜单里打开时申请。
    optional_permissions: ['bookmarks', 'history', 'topSites', 'sessions', 'tabs', 'notifications'],
  },
});

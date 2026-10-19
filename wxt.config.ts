import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    // 名称和描述放在 public/_locales/zh_CN/messages.json：商店按 _locales 识别语言（简体中文），
    // 描述就是商店标题下面那一行。版本号取自 package.json。
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'zh_CN',
    // 新标签页从浏览器本地缓存读取网站图标，不请求远程服务；计时器用闹钟在后台到点提醒，
    // 到点时把通知卡片放进正在看的网页（scripting，还要有那个网站的访问权限）。这几个都没有安装提示。
    permissions: ['favicon', 'alarms', 'scripting'],
    // 读取日历的 iCal 订阅地址、获取网站图标时，按需申请对应网站的访问权限。
    optional_host_permissions: ['https://*/*'],
    // 收藏夹、历史小组件添加后点一下才申请；最近关闭的标签页要 tabs 权限才有网址和标题；计时器的通知在菜单里打开时申请。
    optional_permissions: ['bookmarks', 'history', 'topSites', 'sessions', 'tabs', 'notifications'],
  },
});

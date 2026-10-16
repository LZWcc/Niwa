import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Niwa',
    description: '一方安静的新标签页',
    // 新标签页从浏览器本地缓存读取网站图标，不请求远程服务。
    permissions: ['favicon'],
    // 读取日历的 iCal 订阅地址、获取网站图标时，按需申请对应网站的访问权限。
    optional_host_permissions: ['https://*/*'],
  },
});

import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { TIMER_ALARM } from '@/utils/timer';

// 后台只做一件事：计时器的闹钟到点时发系统通知，新标签页关了也能收到。
// 通知权限是可选的（计时器菜单里打开），没给时没有 notifications 接口，就不发，页面上照样显示时间到。
export default defineBackground(() => {
  browser.alarms.onAlarm.addListener((alarm) => {
    const [kind, , message] = alarm.name.split('|');
    if (kind !== TIMER_ALARM) return;
    void browser.notifications?.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('/icon/128.png'),
      title: '时间到',
      message: message!,
      priority: 2,
    });
  });
});

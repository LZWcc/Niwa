// 计时器到点时，放进当前网页的通知卡片：像 macOS 的通知一样从右边滑进来，往右一划就消失，几秒后自己滑走。
// 后台脚本用 scripting.executeScript 把 showToast 整个函数送进网页去运行，所以它必须自给自足：
// 不能用外面的变量、import，也不能调别的函数。放在 Shadow DOM 里，网页的样式影响不到它，它也不影响网页。
export function showToast(message: string) {
  document.querySelector('niwa-toast')?.remove();
  const host = document.createElement('niwa-toast');
  host.style.cssText = 'all: initial; position: fixed; top: 16px; right: 16px; z-index: 2147483647;';
  const root = host.attachShadow({ mode: 'closed' });
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.innerHTML = `
    <style>
      .card {
        position: relative;
        box-sizing: border-box;
        width: 344px;
        display: flex;
        gap: 12px;
        align-items: flex-start;
        padding: 12px 14px;
        border: 1px solid ${dark ? 'rgb(255 255 255 / 0.12)' : 'rgb(0 0 0 / 0.08)'};
        border-radius: 16px;
        background: ${dark ? 'rgb(44 46 48 / 0.82)' : 'rgb(246 246 246 / 0.86)'};
        box-shadow: 0 10px 30px -8px rgb(0 0 0 / 0.35);
        backdrop-filter: blur(24px) saturate(1.6);
        color: ${dark ? '#eef1ec' : '#1d1d1f'};
        font: 13px/1.4 system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
        cursor: grab;
        user-select: none;
        touch-action: none;
        transform: translateX(calc(100% + 24px));
        transition: transform 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.05), opacity 0.3s;
      }
      .card.in { transform: none; }
      .card.dragging { transition: none; cursor: grabbing; }
      .mark {
        flex-shrink: 0;
        display: grid;
        place-items: center;
        width: 36px;
        height: 36px;
        border-radius: 9px;
        background: ${dark ? '#3a4a52' : '#26313b'};
        color: ${dark ? '#e8c98a' : '#fbfcfc'};
      }
      .text { min-width: 0; flex: 1; }
      .app { font-size: 11px; opacity: 0.6; }
      .title { margin-top: 1px; font-weight: 600; }
      .message { opacity: 0.85; }
      .close {
        position: absolute;
        top: -7px;
        left: -7px;
        display: grid;
        place-items: center;
        width: 20px;
        height: 20px;
        padding: 0;
        border: 1px solid ${dark ? 'rgb(255 255 255 / 0.15)' : 'rgb(0 0 0 / 0.1)'};
        border-radius: 50%;
        background: ${dark ? '#3a3c3e' : '#fff'};
        color: inherit;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.15s;
      }
      .card:hover .close { opacity: 1; }
    </style>
    <div class="card" role="alert">
      <button class="close" type="button" aria-label="关闭">
        <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
      </button>
      <span class="mark" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 7.5V11l2.2 1.6M8 2.5h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
      </span>
      <div class="text">
        <div class="app">Niwa · 计时器</div>
        <div class="title">时间到</div>
        <div class="message"></div>
      </div>
    </div>`;
  const card = root.querySelector<HTMLElement>('.card')!;
  root.querySelector('.message')!.textContent = message;
  document.documentElement.append(host);

  // 滑出去再拿掉；减少动态效果时直接拿掉
  let gone = false;
  const dismiss = () => {
    if (gone) return;
    gone = true;
    if (still) return host.remove();
    card.style.transform = 'translateX(calc(100% + 24px))';
    card.style.opacity = '0';
    setTimeout(() => host.remove(), 400);
  };
  // 几秒后自己滑走，鼠标停在上面时不走
  let timer = setTimeout(dismiss, 8000);
  card.addEventListener('pointerenter', () => clearTimeout(timer));
  card.addEventListener('pointerleave', () => {
    timer = setTimeout(dismiss, 4000);
  });
  root.querySelector('.close')!.addEventListener('click', dismiss);

  // 拖：往右跟手，往左只挪一点（拖不过去）；松手时往右拖过一段、或甩得够快就划掉，否则弹回去。没拖动只是点了一下也收起
  let start: { x: number; t: number } | null = null;
  let dx = 0;
  card.addEventListener('pointerdown', (e) => {
    if ((e.target as Element).closest('.close')) return;
    start = { x: e.clientX, t: performance.now() };
    dx = 0;
    card.setPointerCapture(e.pointerId);
    card.classList.add('dragging');
  });
  card.addEventListener('pointermove', (e) => {
    if (!start) return;
    dx = e.clientX - start.x;
    card.style.transform = `translateX(${dx > 0 ? dx : dx / 4}px)`;
    card.style.opacity = String(Math.max(0.3, 1 - Math.max(0, dx) / 400));
  });
  const release = () => {
    if (!start) return;
    const speed = dx / Math.max(1, performance.now() - start.t);
    start = null;
    card.classList.remove('dragging');
    if (dx > 90 || speed > 0.6 || Math.abs(dx) < 4) return dismiss();
    card.style.transform = '';
    card.style.opacity = '';
  };
  card.addEventListener('pointerup', release);
  card.addEventListener('pointercancel', release);

  // 下一帧再加 in：先按在右边外面的位置画出来，才有滑进来的过程
  if (still) card.classList.add('in');
  else requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('in')));
}

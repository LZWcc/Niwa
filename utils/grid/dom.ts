// 网格在页面上的几个查询，拖动和动画共用。
// 网格的每个子元素带 data-key（快捷方式、小组件的 id；“添加”是 "add"）。

/** 网格里的格子（不含对话框、占位框等没有 data-key 的元素）。 */
export const tiles = (grid: HTMLElement) =>
  [...grid.children].filter((el): el is HTMLElement => el instanceof HTMLElement && !!el.dataset.key);

/** 格子在视口里的排版位置。offset 不受 transform 影响：动画进行中拿到的也是终点位置。 */
export function layoutRect(grid: HTMLElement, el: HTMLElement) {
  const base = grid.getBoundingClientRect();
  return { left: base.left + el.offsetLeft, top: base.top + el.offsetTop, width: el.offsetWidth, height: el.offsetHeight };
}

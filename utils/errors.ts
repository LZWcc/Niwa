// 错误处理的统一约定（详见 README「错误处理」）：
// 1. 预料之中、要告诉用户的失败（连不上网、地址失效、权限被拒、外部数据不对），抛 AppError，message 写给用户看；
// 2. 只在能给用户反馈的地方 catch（对话框里的提示、小组件的状态栏），用 toUserMessage 转成一句话；
// 3. 其余的错误都是 bug，不在原地 catch，交给全局：渲染出错由 ErrorBoundary 接住，
//    其余（事件处理、没人处理的 Promise）由 main.tsx 里的全局监听接住；
// 4. 不管从哪条路来，最后都经过 reportError 记录。

/** 预料之中的失败。message 是给用户看的中文说明，原始错误放在 cause 里。 */
export class AppError extends Error {
  override name = 'AppError';
}

/** 所有错误最后都到这里。新标签页不联网，只打到控制台；以后要存日志或上报，只改这里。 */
export function reportError(error: unknown, where: string) {
  console.error(`[niwa] ${where}`, error);
}

/** 转成给用户看的一句话。不是 AppError 的是意料之外的 bug：顺便记录下来，免得在这里被吞掉。 */
export function toUserMessage(error: unknown, where: string) {
  if (error instanceof AppError) return error.message;
  reportError(error, where);
  return '出了点问题，请稍后再试';
}

import { Component, type ReactNode } from 'react';

type Props = {
  /** 出错后显示的内容；retry 清掉错误、重新渲染子树 */
  fallback: (retry: () => void) => ReactNode;
  children: ReactNode;
};

/**
 * 接住子树渲染时抛出的错误，换成 fallback，不让一处出错拖垮整页。
 * 只管显示；记录统一由 main.tsx 里 createRoot 的 onCaughtError 做。
 */
export default class ErrorBoundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? this.props.fallback(() => this.setState({ failed: false })) : this.props.children;
  }
}

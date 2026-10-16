import { useEffect, useRef, type ReactNode } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  /** 每次打开后调用：重置表单、把焦点放到合适的地方 */
  onOpen?: (dialog: HTMLDialogElement) => void;
  className: string;
  labelledBy: string;
  children: ReactNode;
};

/**
 * 原生 <dialog> 的模态对话框：自带焦点管理、Esc 关闭和背景遮罩。
 * 开关只看 open；关闭一律走 onClose，不依赖异步的原生 close 事件，避免它误关下一次打开的对话框。
 */
export default function Dialog({ open, onClose, onOpen, className, labelledBy, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current!;
    if (open && !el.open) {
      el.showModal();
      onOpen?.(el);
    } else if (!open && el.open) {
      el.close();
    }
    // 只在打开、关闭时执行；onOpen 用打开那一刻的。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={className}
      aria-labelledby={labelledBy}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // 点遮罩关闭：只有点到 dialog 自身（而非内部内容）时 target 才是它。
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {children}
    </dialog>
  );
}

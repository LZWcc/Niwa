import { useEffect, useState } from 'react';
import { hasPermissions, requestPermissions } from '@/utils/permissions';

/**
 * 是否已有这些可选权限（null 表示还在查），以及申请它们的方法（要在点击里直接调用）。
 * list 用模块级常量，保持同一个数组。
 */
export function usePermissions(list: string[]) {
  const [granted, setGranted] = useState<boolean | null>(null);

  useEffect(() => {
    void hasPermissions(list).then(setGranted);
  }, [list]);

  const request = () => void requestPermissions(list).then(setGranted);

  return [granted, request] as const;
}

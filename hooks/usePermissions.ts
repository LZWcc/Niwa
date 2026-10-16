import { useEffect, useState } from 'react';
import { hasPermissions, removePermissions, requestPermissions } from '@/utils/permissions';

/**
 * 是否已有这些可选权限（null 表示还在查），申请它们的方法（要在点击里直接调用），和放弃它们的方法。
 * list 用模块级常量，保持同一个数组。
 */
export function usePermissions(list: string[]) {
  const [granted, setGranted] = useState<boolean | null>(null);

  useEffect(() => {
    void hasPermissions(list).then(setGranted);
  }, [list]);

  const request = () => void requestPermissions(list).then(setGranted);
  const revoke = () => void removePermissions(list).then(() => setGranted(false));

  return [granted, request, revoke] as const;
}

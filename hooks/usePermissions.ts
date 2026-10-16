import { useEffect, useState } from 'react';
import { hasPermissions, onPermissionsChange, removePermissions, requestPermissions } from '@/utils/permissions';

/**
 * 是否已有这些可选权限（null 表示还在查），申请它们的方法（要在点击里直接调用），和放弃它们的方法。
 * list 用模块级常量，保持同一个数组。
 */
export function usePermissions(list: string[]) {
  const [granted, setGranted] = useState<boolean | null>(null);

  // 别处（设置面板、别的小组件）给了或收回，这里也跟着变
  useEffect(() => {
    const check = () => void hasPermissions(list).then(setGranted);
    check();
    return onPermissionsChange(check);
  }, [list]);

  const request = () => void requestPermissions(list).then(setGranted);
  const revoke = () => void removePermissions(list).then(() => setGranted(false));

  return [granted, request, revoke] as const;
}

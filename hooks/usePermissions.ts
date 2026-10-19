import { useEffect, useState } from 'react';
import { hasPermissions, onPermissionsChange, removePermissions, requestPermissions } from '@/utils/permissions';
import { useSample } from './useSample';

/**
 * 是否已有这些可选权限（null 表示还在查），申请它们的方法（要在点击里直接调用），和放弃它们的方法。
 * list 用模块级常量，保持同一个数组。小组件库的预览里当作都有，不查也不申请。
 */
export function usePermissions(list: string[]) {
  const sample = useSample();
  const [granted, setGranted] = useState<boolean | null>(null);

  // 别处（设置面板、别的小组件）给了或收回，这里也跟着变
  useEffect(() => {
    if (sample) return;
    const check = () => void hasPermissions(list).then(setGranted);
    check();
    return onPermissionsChange(check);
  }, [list, sample]);

  const request = () => void requestPermissions(list).then(setGranted);
  const revoke = () => void removePermissions(list).then(() => setGranted(false));

  return [sample || granted, request, revoke] as const;
}

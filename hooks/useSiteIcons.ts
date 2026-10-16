import { useEffect, useState } from 'react';
import { ICONS } from '@/config';
import { reportError } from '@/utils/errors';
import { ICON_ORIGINS, findSiteIcons } from '@/utils/icons/fetch';
import { hasOrigins, requestOrigins } from '@/utils/permissions';

/**
 * 网址对应的候选图标。第一次要用户点一下允许访问网站（浏览器只允许在点击里申请权限），之后输入网址就自动获取。
 * 各个来源同时取，先回来的先显示；同一个网址取完一次就不再取。
 */
export function useSiteIcons(href: string | null) {
  const [access, setAccess] = useState<boolean | null>(null);
  // 每个来源一格，按优先级排；undefined 表示这个来源还没回来。
  const [result, setResult] = useState<{ href: string; found: (string[] | undefined)[] } | null>(null);
  const found = result?.href === href ? result.found : [];
  const done = !!href && result?.href === href && found.every((icons) => icons !== undefined);

  useEffect(() => {
    void hasOrigins(ICON_ORIGINS).then(setAccess);
  }, []);

  useEffect(() => {
    if (!href || !access || done) return;
    let alive = true;
    const timer = setTimeout(() => {
      const tasks = findSiteIcons(href);
      setResult({ href, found: tasks.map(() => undefined) });
      tasks.forEach((task, i) =>
        task
          // 各来源自己会把取不到当作空数组，走到这里是 bug：记下来，当作这个来源没找到。
          .catch((error) => {
            reportError(error, '获取网站图标');
            return [];
          })
          .then((icons) => {
            if (!alive) return;
            setResult((r) => (r?.href === href ? { href, found: r.found.map((f, j) => (j === i ? icons : f)) } : r));
          }),
      );
    }, ICONS.debounce);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // done 只用来跳过已经取完的网址，它变了不需要重新获取。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [href, access]);

  return {
    // 不同来源可能给出同一张图
    icons: [...new Set(found.flatMap((icons) => icons ?? []))],
    loading: !!href && !!access && !done,
    /** 所有来源都回来了（不管找没找到） */
    done,
    /** 还没允许访问网站：显示按钮，点了调用 allow */
    needsAccess: access === false,
    allow: () => requestOrigins(ICON_ORIGINS).then(setAccess),
  };
}

export type SiteIcons = ReturnType<typeof useSiteIcons>;

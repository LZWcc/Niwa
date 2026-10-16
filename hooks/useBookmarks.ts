import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import type { BookmarkNode } from '@/utils/browsing';

type Listenable = { addListener: (f: () => void) => void; removeListener: (f: () => void) => void };

/** 整棵收藏夹树；enabled（有权限）之后才读。在浏览器里增删改收藏时重新读一遍。 */
export function useBookmarks(enabled: boolean) {
  const [tree, setTree] = useState<BookmarkNode | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const load = () => void browser.bookmarks.getTree().then(([root]) => setTree(root!));
    const { onCreated, onRemoved, onChanged, onMoved, onChildrenReordered } = browser.bookmarks;
    const events: Listenable[] = [onCreated, onRemoved, onChanged, onMoved, onChildrenReordered];
    load();
    events.forEach((e) => e.addListener(load));
    return () => events.forEach((e) => e.removeListener(load));
  }, [enabled]);

  return tree;
}

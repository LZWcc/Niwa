import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import type { BookmarkNode } from '@/utils/browsing';
import { SAMPLE_BOOKMARKS } from '@/utils/sample';
import { useSample } from './useSample';

type Listenable = { addListener: (f: () => void) => void; removeListener: (f: () => void) => void };

/** 整棵收藏夹树；enabled（有权限）之后才读。在浏览器里增删改收藏时重新读一遍。预览里是演示的收藏夹。 */
export function useBookmarks(enabled: boolean) {
  const sample = useSample();
  const [tree, setTree] = useState<BookmarkNode | null>(null);

  useEffect(() => {
    if (!enabled || sample) return;
    const load = () => void browser.bookmarks.getTree().then(([root]) => setTree(root!));
    const { onCreated, onRemoved, onChanged, onMoved, onChildrenReordered } = browser.bookmarks;
    const events: Listenable[] = [onCreated, onRemoved, onChanged, onMoved, onChildrenReordered];
    load();
    events.forEach((e) => e.addListener(load));
    return () => events.forEach((e) => e.removeListener(load));
  }, [enabled, sample]);

  return sample ? SAMPLE_BOOKMARKS : tree;
}

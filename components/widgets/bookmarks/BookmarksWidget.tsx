import { useState } from 'react';
import { useBookmarks } from '@/hooks/useBookmarks';
import { usePermissions } from '@/hooks/usePermissions';
import { folderName, hostOf, isWebUrl, pathTo, searchBookmarks } from '@/utils/browsing';
import { KEYS } from '@/utils/storage';
import AccessPrompt from '../AccessPrompt';
import LinkRow from '../LinkRow';
import LinksSearch from '../LinksSearch';
import type { WidgetProps } from '../types';
import WidgetFrame from '../WidgetFrame';

// 收藏夹：在卡片里按文件夹浏览浏览器的收藏，记住上次看到的文件夹；中、大尺寸可以搜索全部收藏。

const PERMISSIONS = ['bookmarks'];

export default function BookmarksWidget({ widget, frame }: WidgetProps) {
  const { size } = widget;
  const [granted, request] = usePermissions(PERMISSIONS);
  const tree = useBookmarks(granted === true);
  const [folderId, setFolderId] = useState(() => localStorage.getItem(KEYS.bookmarkFolder));
  // null：没在搜索
  const [query, setQuery] = useState<string | null>(null);

  const open = (id: string) => {
    setFolderId(id);
    localStorage.setItem(KEYS.bookmarkFolder, id);
  };

  let content = null;
  if (granted === false) {
    content = (
      <AccessPrompt text="在这里浏览收藏夹，需要允许读取浏览器的收藏夹。只在这台电脑上显示。" action="允许读取收藏夹" onRequest={request} />
    );
  } else if (tree) {
    // 第一次打开，或上次看的文件夹已经删了：从收藏夹栏开始。
    const found = folderId ? pathTo(tree, folderId) : [];
    const path = found.length ? found : [tree, tree.children![0]!];
    const folder = path.at(-1)!;
    const parent = path.at(-2);
    const searching = size !== 's' && query !== null;
    const results = searching && query.trim() ? searchBookmarks(tree, query) : null;
    const items = (results ?? folder.children!).filter((n) => n.children || isWebUrl(n.url));

    content = (
      <>
        <header className="links-head">
          {searching ? (
            <LinksSearch label="搜索全部收藏" query={query} onChange={setQuery} />
          ) : (
            <>
              {parent && (
                <button type="button" className="links-back" aria-label={`返回${folderName(parent)}`} onClick={() => open(parent.id)}>
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                    <path
                      d="M7.5 2.5L4 6l3.5 3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
              {size !== 's' && path.length > 2 && (
                <span className="links-path">
                  {path
                    .slice(1, -1)
                    .map((n) => `${folderName(n)} / `)
                    .join('')}
                </span>
              )}
              <h2 className="widget-title links-name">{folderName(folder)}</h2>
              {size !== 's' && <LinksSearch label="搜索全部收藏" query={null} onChange={setQuery} />}
            </>
          )}
        </header>

        {items.length === 0 ? (
          <p className="links-empty">{results ? '没有找到' : '这个文件夹是空的'}</p>
        ) : (
          <ul className={size === 's' ? 'links-list' : 'links-list is-cols'}>
            {items.map((node) => (
              <li key={node.id}>
                {node.children ? (
                  <button
                    type="button"
                    className="link-row is-folder"
                    onClick={() => {
                      open(node.id);
                      setQuery(null);
                    }}
                  >
                    <span className="link-icon" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 16 16">
                        <path
                          d="M2 4.5A1.5 1.5 0 0 1 3.5 3h3l1.5 1.5h4.5A1.5 1.5 0 0 1 14 6v5.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5z"
                          fill="currentColor"
                        />
                      </svg>
                    </span>
                    <span className="link-title">{folderName(node)}</span>
                  </button>
                ) : (
                  <LinkRow url={node.url!} title={node.title || hostOf(node.url!)} />
                )}
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  return (
    <WidgetFrame widget={widget} frame={frame}>
      <div className={`links links-${size}`}>{content}</div>
    </WidgetFrame>
  );
}

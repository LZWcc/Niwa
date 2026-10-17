import { useState } from 'react';
import { folderName, hostOf, isWebUrl, pathTo, searchBookmarks, type BookmarkNode } from '@/utils/browsing';
import LinkRow from '../LinkRow';
import PanelDialog from '../PanelDialog';

type Props = { open: boolean; tree: BookmarkNode; folder: string; onClose: () => void };

// 收藏夹的大面板：左边是全部文件夹，右边是选中文件夹里的内容，上面的搜索框搜全部收藏。
// 在面板里看哪个文件夹不改卡片的；每次打开从卡片正在看的文件夹开始。

const subfolders = (node: BookmarkNode) => node.children?.filter((n) => n.children) ?? [];

const FolderIcon = () => (
  <span className="link-icon" aria-hidden="true">
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path
        d="M2 4.5A1.5 1.5 0 0 1 3.5 3h3l1.5 1.5h4.5A1.5 1.5 0 0 1 14 6v5.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5z"
        fill="currentColor"
      />
    </svg>
  </span>
);

export default function BookmarksPanel({ open, tree, folder: cardFolder, onClose }: Props) {
  const [folderId, setFolderId] = useState(cardFolder);
  const [query, setQuery] = useState('');
  // 左边展开了哪些文件夹
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // 文件夹被删了：回到卡片的那个
  const found = pathTo(tree, folderId);
  const path = found.length ? found : pathTo(tree, cardFolder);
  const folder = path.at(-1)!;
  const results = query.trim() ? searchBookmarks(tree, query) : null;
  const items = (results ?? folder.children ?? []).filter((n) => n.children || isWebUrl(n.url));

  const select = (id: string) => {
    setFolderId(id);
    setQuery('');
    // 选中的文件夹和它的上级都展开
    setExpanded((old) => new Set([...old, ...pathTo(tree, id).map((n) => n.id)]));
  };
  const toggle = (id: string) =>
    setExpanded((old) => {
      const next = new Set(old);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  // 左边的一层文件夹，展开的往下接着画
  const branch = (nodes: BookmarkNode[], depth: number) => (
    <ul>
      {nodes.map((node) => {
        const children = subfolders(node);
        const isOpen = expanded.has(node.id);
        return (
          <li key={node.id}>
            <div
              className={!results && node.id === folder.id ? 'bm-folder is-selected' : 'bm-folder'}
              style={{ paddingLeft: 4 + depth * 14 }}
            >
              {children.length ? (
                <button
                  type="button"
                  className={isOpen ? 'bm-twisty is-open' : 'bm-twisty'}
                  aria-label={isOpen ? `收起${folderName(node)}` : `展开${folderName(node)}`}
                  aria-expanded={isOpen}
                  onClick={() => toggle(node.id)}
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
                    <path d="M3 1.5 5.5 4 3 6.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </button>
              ) : (
                <span className="bm-twisty" />
              )}
              <button type="button" className="bm-folder-name" onClick={() => select(node.id)}>
                {folderName(node)}
              </button>
            </div>
            {isOpen && children.length > 0 && branch(children, depth + 1)}
          </li>
        );
      })}
    </ul>
  );

  return (
    <PanelDialog
      open={open}
      onClose={onClose}
      title="收藏夹"
      className="bookmarks-dialog"
      onOpen={(el) => {
        setFolderId(cardFolder);
        setQuery('');
        setExpanded(new Set(pathTo(tree, cardFolder).map((n) => n.id)));
        el.querySelector<HTMLElement>('.panel-search')?.focus();
      }}
      tools={
        <input
          className="panel-search"
          value={query}
          placeholder="搜索全部收藏"
          aria-label="搜索全部收藏"
          onChange={(e) => setQuery(e.target.value)}
        />
      }
      status={results ? `找到 ${items.length} 个` : ''}
    >
      <nav className="bm-tree" aria-label="文件夹">
        {branch(subfolders(tree), 0)}
      </nav>
      <div className="bm-content">
        {/* 所在的文件夹，每一级都能点 */}
        {!results && (
          <div className="bm-crumbs">
            {path.slice(1).map((node, i, list) =>
              i === list.length - 1 ? (
                <span key={node.id}>{folderName(node)}</span>
              ) : (
                <button key={node.id} type="button" onClick={() => select(node.id)}>
                  {folderName(node)}
                </button>
              ),
            )}
          </div>
        )}
        {items.length === 0 ? (
          <p className="links-empty">{results ? '没有找到' : '这个文件夹是空的'}</p>
        ) : (
          <ul className="links-list">
            {items.map((node) => (
              <li key={node.id}>
                {node.children ? (
                  <button type="button" className="link-row is-folder" onClick={() => select(node.id)}>
                    <FolderIcon />
                    <span className="link-title">{folderName(node)}</span>
                  </button>
                ) : (
                  // 搜索时写在哪个文件夹里，平时写域名
                  <LinkRow
                    url={node.url!}
                    title={node.title || hostOf(node.url!)}
                    meta={results ? folderName(pathTo(tree, node.parentId!).at(-1) ?? tree) : hostOf(node.url!)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </PanelDialog>
  );
}

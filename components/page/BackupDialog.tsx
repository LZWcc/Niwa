import { useState } from 'react';
import Dialog from '@/components/common/Dialog';
import { SECRET_LABELS, createBackup, parseBackup, restoreBackup, secretsIn, type Backup } from '@/utils/backup';
import { allLinks } from '@/utils/grid/items';
import { dayKey } from '@/utils/date';
import { toUserMessage } from '@/utils/errors';

/** 导入前给用户看的摘要：里面有什么、什么时候导出的 */
function summary({ data, exportedAt }: Backup) {
  const folders = data.grid.filter((item) => item.kind === 'folder').length;
  const parts = [
    `${allLinks(data.grid).length} 个快捷方式`,
    ...(folders ? [`${folders} 个文件夹`] : []),
    `${data.grid.filter((item) => item.kind === 'widget').length} 个小组件`,
    `${data.grid.reduce((n, item) => n + (item.kind === 'widget' ? (item.settings?.notes?.length ?? 0) : 0), 0)} 条便签`,
  ];
  return `${parts.join('、')}，导出于 ${new Date(exportedAt).toLocaleString()}`;
}

/** 导入会替换什么：私密数据只替换备份里带了的，其余保持不变 */
function replaced({ data }: Backup) {
  const included = secretsIn(data);
  const kept = SECRET_LABELS.filter((label) => !included.includes(label));
  return `当前的布局、图标、便签和设置会被替换${included.length ? `，${included.join('、')}也会被替换` : ''}${kept.length ? `；${kept.join('、')}保持不变` : ''}。`;
}

// 备份与恢复（在设置面板里打开）：导出成一个 JSON 文件；在另一个浏览器里导入，整体替换那边的数据。
export default function BackupDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [withSecrets, setWithSecrets] = useState(false);
  const [pending, setPending] = useState<Backup | null>(null);
  const [error, setError] = useState('');

  // 导入的日历文件要从 IndexedDB 里读，导出是异步的。
  const exportFile = () => {
    createBackup(withSecrets).then(
      (backup) => {
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `niwa-backup-${dayKey(new Date())}.json`;
        link.click();
        // 下载开始之前不能撤销地址，过一会儿再释放。
        setTimeout(() => URL.revokeObjectURL(link.href), 60_000);
      },
      (err) => setError(toUserMessage(err, '导出备份')),
    );
  };

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPending(null);
    setError('');
    file
      .text()
      .then(parseBackup)
      .then(setPending, (err) => setError(toUserMessage(err, '读取备份文件')));
  };

  const restore = () => {
    // 写 localStorage 可能因为存不下而失败（日历文件写进 IndexedDB 也可能失败），要告诉用户。
    restoreBackup(pending!).then(
      () => location.reload(),
      (err) => setError(toUserMessage(err, '导入备份')),
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="dialog"
      labelledBy="backup-title"
      onOpen={() => {
        setPending(null);
        setError('');
      }}
    >
      <div className="dialog-body">
        <h2 id="backup-title" className="dialog-title">
          备份与恢复
        </h2>

        <section className="backup-section">
          <h3>导出</h3>
          <p>布局、图标、便签、庭的天数和偏好设置，存成一个文件。</p>
          <label className="backup-check">
            <input type="checkbox" checked={withSecrets} onChange={(e) => setWithSecrets(e.target.checked)} />
            包含私密信息：{SECRET_LABELS.join('、')}（相当于密码，文件要妥善保管）
          </label>
          <button type="button" className="btn btn-primary" onClick={exportFile}>
            导出备份
          </button>
        </section>

        <section className="backup-section">
          <h3>导入</h3>
          <p>用备份文件替换这里现在的数据。</p>
          <label className="btn">
            选择备份文件…
            <input type="file" accept=".json,application/json" hidden onChange={pickFile} />
          </label>
          {pending && (
            <div className="backup-pending">
              <p>{summary(pending)}</p>
              <p>{replaced(pending)}</p>
              <button type="button" className="btn btn-danger" onClick={restore}>
                替换当前数据
              </button>
            </div>
          )}
          {error && <p className="field-error">{error}</p>}
        </section>

        <footer className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            完成
          </button>
        </footer>
      </div>
    </Dialog>
  );
}

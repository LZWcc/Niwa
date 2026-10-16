import { useEffect } from 'react';
import Grid from '@/components/grid/Grid';
import BackupButton from '@/components/page/BackupButton';
import Clock from '@/components/page/Clock';
import Scene from '@/components/page/Scene';
import ThemeToggle from '@/components/page/ThemeToggle';
import Search from '@/components/search/Search';
import { useMinute } from '@/hooks/useMinute';
import { useVisits } from '@/hooks/useVisits';
import { applyAtmosphere } from '@/utils/almanac';
import { preview } from '@/utils/preview';

// 新标签页：背景的景、左上角的时间、居中的搜索框，下面是快捷方式和小组件的网格。
export default function App() {
  const now = useMinute();
  // 不管有没有放庭，每天打开都记一次；庭的天数从第一次打开算起。
  useVisits(now);

  // 季节和时辰决定主色、天色，写在 <html> 上。
  useEffect(() => applyAtmosphere(now, preview), [now]);

  return (
    <>
      <Scene />
      <Clock now={now} />
      <div className="page-actions">
        <BackupButton />
        <ThemeToggle />
      </div>
      <main className="newtab">
        <Search />
        <Grid now={now} />
      </main>
    </>
  );
}

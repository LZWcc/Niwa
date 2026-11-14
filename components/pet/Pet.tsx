import { lazy, Suspense } from 'react';
import { useStored } from '@/hooks/useStored';
import { isPet, type Pet as PetData } from '@/utils/pet/model';
import { KEYS, readJson } from '@/utils/storage';

// 宠物：浮在页面上（不占网格）。没导入时只读一下 niwa:pet，宠物的代码（PetSprite、utils/pet/sprite.ts）都不加载。
const PetSprite = lazy(() => import('./PetSprite'));

export default function Pet() {
  const [pet, setPet] = useStored<PetData | null>(KEYS.pet, () => readJson(KEYS.pet, isPet));
  // 换了一只（id 变了）就整个重来：重新读图片，状态清零
  return (
    pet && (
      <Suspense fallback={null}>
        <PetSprite key={pet.id} pet={pet} onMove={(spot) => setPet((p) => p && { ...p, ...spot })} />
      </Suspense>
    )
  );
}

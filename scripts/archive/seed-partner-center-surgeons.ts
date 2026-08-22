import '@/lib/env';

import { asc, eq } from 'drizzle-orm';

import { db } from '@/server/db';
import { partnerCenters, partnerCenterSurgeons, surgeons } from '@/server/db/schema';

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

function pickCount(max: number) {
  if (max <= 0) return 0;
  if (max === 1) return 1;
  // 多数中心 2~4 名；少量中心可到上限
  const preferred = 2 + Math.floor(Math.random() * 3);
  return Math.min(max, preferred);
}

async function main() {
  const centers = await db
    .select({ id: partnerCenters.id, slug: partnerCenters.slug })
    .from(partnerCenters)
    .orderBy(asc(partnerCenters.sortOrder), asc(partnerCenters.slug));
  const surgeonRows = await db
    .select({ id: surgeons.id, slug: surgeons.slug })
    .from(surgeons)
    .orderBy(asc(surgeons.sortOrder), asc(surgeons.slug));

  if (!centers.length) {
    throw new Error('没有合作中心数据，请先 seed partner-centers');
  }
  if (!surgeonRows.length) {
    throw new Error('没有术者数据，请先 seed surgeons');
  }

  console.log(`合作中心 ${centers.length} 个，术者 ${surgeonRows.length} 个`);

  // 清空旧关联后重建，保证结果可复现为“本轮随机”
  await db.delete(partnerCenterSurgeons);

  let linkCount = 0;
  const surgeonLinkCounts = new Map<string, number>();

  for (const center of centers) {
    const count = pickCount(surgeonRows.length);
    const picked = shuffle(surgeonRows).slice(0, count);
    if (!picked.length) continue;

    await db.insert(partnerCenterSurgeons).values(
      picked.map((surgeon, index) => ({
        centerId: center.id,
        surgeonId: surgeon.id,
        sortOrder: (index + 1) * 10,
      })),
    );

    linkCount += picked.length;
    for (const surgeon of picked) {
      surgeonLinkCounts.set(surgeon.id, (surgeonLinkCounts.get(surgeon.id) ?? 0) + 1);
    }

    console.log(`  ${center.slug} ← ${picked.map((item) => item.slug).join(', ')}`);
  }

  // 确保每个术者至少挂到一个中心（兼容多对多：允许同一术者挂多个中心）
  const orphanSurgeons = surgeonRows.filter((row) => !surgeonLinkCounts.has(row.id));
  if (orphanSurgeons.length) {
    console.log(`\n补挂未关联术者 ${orphanSurgeons.length} 名…`);
    for (const surgeon of orphanSurgeons) {
      const center = centers[Math.floor(Math.random() * centers.length)]!;
      await db
        .insert(partnerCenterSurgeons)
        .values({
          centerId: center.id,
          surgeonId: surgeon.id,
          sortOrder: 999,
        })
        .onConflictDoNothing();
      linkCount += 1;
      console.log(`  ${center.slug} ← ${surgeon.slug} (补挂)`);
    }
  }

  const multiLinked = [...surgeonLinkCounts.entries()].filter(([, n]) => n > 1).length;
  console.log(`\n完成：关联 ${linkCount} 条；其中 ${multiLinked} 名术者关联了多个中心。`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

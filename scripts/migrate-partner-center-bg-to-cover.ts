import '@/lib/env';

import { eq } from 'drizzle-orm';

import { db } from '@/server/db';
import { partnerCenters } from '@/server/db/schema';

/** Unified hospital-related preset: 现代医院大厅 */
const PRESET_ID = 'u-01';
const APPLY = process.argv.includes('--apply');

async function main() {
  const rows = await db
    .select({
      id: partnerCenters.id,
      slug: partnerCenters.slug,
      coverImage: partnerCenters.coverImage,
      backgroundImage: partnerCenters.backgroundImage,
      backgroundMode: partnerCenters.backgroundMode,
      backgroundValue: partnerCenters.backgroundValue,
      showCoverOnBackground: partnerCenters.showCoverOnBackground,
    })
    .from(partnerCenters);

  console.log(`合作中心 ${rows.length} 个；目标背景预置: ${PRESET_ID}`);
  console.log(`模式: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const coverFromBg =
      row.backgroundMode === 'upload' && row.backgroundImage.trim()
        ? row.backgroundImage.trim()
        : row.coverImage.trim();

    if (!coverFromBg && row.backgroundMode === 'preset' && row.backgroundValue === PRESET_ID && row.coverImage) {
      skipped += 1;
      continue;
    }

    if (!coverFromBg) {
      console.warn(`跳过（无可用封面）: ${row.slug}`);
      skipped += 1;
      continue;
    }

    console.log(
      `  ${row.slug}: cover←${coverFromBg.slice(0, 60)}…  bg→preset/${PRESET_ID}  showCover=true`,
    );

    if (APPLY) {
      await db
        .update(partnerCenters)
        .set({
          coverImage: coverFromBg,
          backgroundMode: 'preset',
          backgroundValue: PRESET_ID,
          backgroundImage: '',
          showCoverOnBackground: true,
          updatedAt: new Date(),
        })
        .where(eq(partnerCenters.id, row.id));
    }
    updated += 1;
  }

  console.log(`\n完成：${APPLY ? '已更新' : '将更新'} ${updated}，跳过 ${skipped}`);
  if (!APPLY) {
    console.log('加 --apply 执行写入。');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

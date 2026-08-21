import '@/lib/env';

import { and, eq } from 'drizzle-orm';

import { SURGEON_PROFILE_SEED_RECORDS } from '@/lib/surgeon-profile-seed-data';
import { db } from '@/server/db';
import { surgeons, surgeonTranslations } from '@/server/db/schema';

async function main() {
  let updated = 0;
  let skipped = 0;

  for (const record of SURGEON_PROFILE_SEED_RECORDS) {
    const [row] = await db.select({ id: surgeons.id }).from(surgeons).where(eq(surgeons.slug, record.slug)).limit(1);
    if (!row) {
      console.warn(`跳过（术者不存在）: ${record.slug}`);
      skipped += 1;
      continue;
    }

    const now = new Date();
    await db
      .update(surgeons)
      .set({
        certificationYear: record.certificationYear,
        surgeryCount: record.surgeryCount,
        updatedAt: now,
      })
      .where(eq(surgeons.id, row.id));

    for (const [locale, data] of Object.entries(record.i18n)) {
      const [existT] = await db
        .select({ id: surgeonTranslations.id })
        .from(surgeonTranslations)
        .where(and(eq(surgeonTranslations.surgeonId, row.id), eq(surgeonTranslations.locale, locale)))
        .limit(1);

      if (!existT) {
        console.warn(`跳过翻译（locale 不存在）: ${record.slug} / ${locale}`);
        continue;
      }

      await db
        .update(surgeonTranslations)
        .set({
          detailDescription: data.detailDescription,
          otherCertifications: data.otherCertifications,
          specialties: data.specialties,
          updatedAt: now,
        })
        .where(eq(surgeonTranslations.id, existT.id));
    }

    updated += 1;
    console.log(`已更新术者资料字段: ${record.slug}`);
  }

  console.log(`\n完成：更新 ${updated} 位，跳过 ${skipped} 位。`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

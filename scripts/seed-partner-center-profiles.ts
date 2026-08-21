import '@/lib/env';

import { and, eq } from 'drizzle-orm';

import { MEDIA_ASSET_TYPE_PARTNER_CENTER_BACKGROUND } from '@/lib/partner-center-background-presets';
import { PARTNER_CENTER_PROFILE_SEED_RECORDS } from '@/lib/partner-center-profile-seed-data';
import { createAdminMediaAssetFromKey } from '@/server/admin/media-assets';
import { db } from '@/server/db';
import { partnerCenters, partnerCenterTranslations } from '@/server/db/schema';
import { putStorageObject } from '@/server/oss';

async function downloadBuffer(url: string) {
  const r = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; hongyu-partner-center-profiles/1.0)' },
  });
  if (!r.ok) throw new Error(`Download failed ${r.status}: ${url}`);
  return Buffer.from(await r.arrayBuffer());
}

async function uploadBackground(slug: string, url: string) {
  const key = `partner-centers/${slug}/background.jpg`;
  console.log(`上传大背景图: ${slug} → ${key}`);
  const buffer = await downloadBuffer(url);
  const result = await putStorageObject(key, buffer, 'image/jpeg');
  if (!result.ok) throw new Error(result.error);
  return result.key;
}

async function main() {
  let updated = 0;
  let skipped = 0;

  for (const record of PARTNER_CENTER_PROFILE_SEED_RECORDS) {
    const [row] = await db
      .select({ id: partnerCenters.id })
      .from(partnerCenters)
      .where(eq(partnerCenters.slug, record.slug))
      .limit(1);

    if (!row) {
      console.warn(`跳过（中心不存在）: ${record.slug}`);
      skipped += 1;
      continue;
    }

    const now = new Date();
    const backgroundKey = await uploadBackground(record.slug, record.backgroundUrl);
    const asset = await createAdminMediaAssetFromKey({
      type: MEDIA_ASSET_TYPE_PARTNER_CENTER_BACKGROUND,
      storageKey: backgroundKey,
      filename: `${record.slug}-background.jpg`,
      contentType: 'image/jpeg',
      byteSize: 0,
    });

    await db
      .update(partnerCenters)
      .set({
        email: record.email,
        ...(record.website ? { website: record.website } : {}),
        backgroundImage: backgroundKey,
        backgroundMode: 'upload',
        backgroundValue: asset.id,
        updatedAt: now,
      })
      .where(eq(partnerCenters.id, row.id));

    for (const [locale, data] of Object.entries(record.i18n)) {
      const [existT] = await db
        .select({ id: partnerCenterTranslations.id })
        .from(partnerCenterTranslations)
        .where(and(
          eq(partnerCenterTranslations.centerId, row.id),
          eq(partnerCenterTranslations.locale, locale),
        ))
        .limit(1);

      if (!existT) {
        console.warn(`跳过翻译（locale 不存在）: ${record.slug} / ${locale}`);
        continue;
      }

      await db
        .update(partnerCenterTranslations)
        .set({
          ...(data.badgeText ? { badgeText: data.badgeText } : {}),
          ...(data.address ? { address: data.address } : {}),
          detailDescription: data.detailDescription,
          stats: data.stats,
          cooperationInfo: data.cooperationInfo,
          updatedAt: now,
        })
        .where(eq(partnerCenterTranslations.id, existT.id));
    }

    updated += 1;
    console.log(`已更新: ${record.slug}`);
  }

  console.log(`完成：更新 ${updated}，跳过 ${skipped}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

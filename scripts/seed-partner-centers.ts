import '@/lib/env';

import { and, eq } from 'drizzle-orm';

import { PARTNER_CENTER_SEED_RECORDS, type PartnerCenterSeedRecord } from '@/lib/partner-center-seed-data';
import { db } from '@/server/db';
import { partnerCenters, partnerCenterTranslations } from '@/server/db/schema';
import { putStorageObject } from '@/server/oss';

const forceRefresh = process.argv.includes('--force');

async function downloadBuffer(url: string) {
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; hongyu-centers-seed/1.0)' } });
  if (!r.ok) throw new Error(`Download failed ${r.status}: ${url}`);
  return Buffer.from(await r.arrayBuffer());
}

async function uploadImage(slug: string, role: 'cover' | 'logo', url: string) {
  const ext = role === 'logo' ? '.png' : '.jpg';
  const key = `partner-centers/${slug}/${role}${ext}`;
  console.log(`  上传 ${role}: ${slug} → ${key}`);
  const buffer = await downloadBuffer(url);
  const result = await putStorageObject(key, buffer, role === 'logo' ? 'image/png' : 'image/jpeg');
  if (!result.ok) throw new Error(result.error);
  return result.key;
}

async function upsertCenter(record: PartnerCenterSeedRecord, coverKey: string, logoKey: string) {
  const now = new Date();
  const [existing] = await db.select({ id: partnerCenters.id }).from(partnerCenters).where(eq(partnerCenters.slug, record.slug)).limit(1);
  let centerId = existing?.id;

  if (existing) {
    if (!forceRefresh) {
      console.log(`  跳过已存在: ${record.slug}`);
      return;
    }
    await db.update(partnerCenters).set({ region: record.region, coverImage: coverKey, logo: logoKey, sortOrder: record.sortOrder, updatedAt: now }).where(eq(partnerCenters.id, existing.id));
  } else {
    const [inserted] = await db.insert(partnerCenters).values({ slug: record.slug, region: record.region, coverImage: coverKey, logo: logoKey, sortOrder: record.sortOrder }).returning({ id: partnerCenters.id });
    centerId = inserted.id;
  }

  if (!centerId) throw new Error(`Failed to upsert ${record.slug}`);

  for (const [locale, data] of Object.entries(record.i18n)) {
    const [existT] = await db.select({ id: partnerCenterTranslations.id }).from(partnerCenterTranslations)
      .where(and(eq(partnerCenterTranslations.centerId, centerId), eq(partnerCenterTranslations.locale, locale))).limit(1);

    const values = { name: data.name, description: data.description, location: data.location, badgeText: data.badgeText, address: data.address, businessHours: data.businessHours, contact: data.contact, website: data.website, tags: data.tags, updatedAt: now };

    if (existT) {
      await db.update(partnerCenterTranslations).set(values).where(eq(partnerCenterTranslations.id, existT.id));
    } else {
      await db.insert(partnerCenterTranslations).values({ centerId, locale, ...values });
    }
  }
}

async function main() {
  for (const record of PARTNER_CENTER_SEED_RECORDS) {
    console.log(`\n处理合作中心: ${record.slug}`);
    const coverKey = await uploadImage(record.slug, 'cover', record.coverUrl);
    const logoKey = await uploadImage(record.slug, 'logo', record.logoUrl);
    await upsertCenter(record, coverKey, logoKey);
    console.log(`  已写入: ${record.slug}`);
  }
  console.log('\n合作中心种子数据完成。');
}

main().catch((e) => { console.error(e); process.exit(1); });

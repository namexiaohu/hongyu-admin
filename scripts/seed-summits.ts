import '@/lib/env';

import { and, eq } from 'drizzle-orm';

import { SUMMIT_SEED_RECORDS, type SummitSeedRecord } from '@/lib/summit-seed-data';
import type { AgendaGroup, SpeakerItem } from '@/lib/summit-content';
import { db } from '@/server/db';
import { summits, summitTranslations } from '@/server/db/schema';
import { putStorageObject } from '@/server/oss';

const forceRefresh = process.argv.includes('--force');

async function downloadBuffer(url: string) {
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; hongyu-summits-seed/1.0)' } });
  if (!r.ok) throw new Error(`Download failed ${r.status}: ${url}`);
  return Buffer.from(await r.arrayBuffer());
}

async function uploadImage(slug: string, role: 'cover' | 'venue', url: string) {
  const key = `summits/${slug}/${role}.jpg`;
  console.log(`  上传 ${role}: ${slug} → ${key}`);
  const buffer = await downloadBuffer(url);
  const result = await putStorageObject(key, buffer, 'image/jpeg');
  if (!result.ok) throw new Error(result.error);
  return result.key;
}

async function upsertSummit(record: SummitSeedRecord, coverKey: string, venueKey: string) {
  const now = new Date();
  const [existing] = await db.select({ id: summits.id }).from(summits).where(eq(summits.slug, record.slug)).limit(1);
  let summitId = existing?.id;

  if (existing) {
    if (!forceRefresh) {
      console.log(`  跳过已存在: ${record.slug}`);
      return;
    }
    await db.update(summits).set({
      status: record.status,
      startDate: new Date(record.startDate),
      endDate: new Date(record.endDate),
      coverImage: coverKey,
      venueImage: venueKey,
      agenda: record.agenda as AgendaGroup[],
      sortOrder: record.sortOrder,
      updatedAt: now,
    }).where(eq(summits.id, existing.id));
  } else {
    const [inserted] = await db.insert(summits).values({
      slug: record.slug,
      status: record.status,
      startDate: new Date(record.startDate),
      endDate: new Date(record.endDate),
      coverImage: coverKey,
      venueImage: venueKey,
      agenda: record.agenda as AgendaGroup[],
      sortOrder: record.sortOrder,
    }).returning({ id: summits.id });
    summitId = inserted.id;
  }

  if (!summitId) throw new Error(`Failed to upsert ${record.slug}`);

  for (const [locale, data] of Object.entries(record.i18n)) {
    const [existT] = await db.select({ id: summitTranslations.id }).from(summitTranslations)
      .where(and(eq(summitTranslations.summitId, summitId), eq(summitTranslations.locale, locale))).limit(1);

    const values = {
      title: data.title,
      description: data.description,
      scale: data.scale,
      duration: data.duration,
      location: data.location,
      address: data.address,
      transportation: data.transportation,
      speakers: data.speakers as SpeakerItem[],
      updatedAt: now,
    };

    if (existT) {
      await db.update(summitTranslations).set(values).where(eq(summitTranslations.id, existT.id));
    } else {
      await db.insert(summitTranslations).values({ summitId, locale, ...values });
    }
  }
}

async function main() {
  for (const record of SUMMIT_SEED_RECORDS) {
    console.log(`\n处理行业峰会: ${record.slug}`);
    const coverKey = await uploadImage(record.slug, 'cover', record.coverImageUrl);
    const venueKey = await uploadImage(record.slug, 'venue', record.venueImageUrl);
    await upsertSummit(record, coverKey, venueKey);
    console.log(`  已写入: ${record.slug}`);
  }
  console.log('\n行业峰会种子数据完成。');
}

main().catch((e) => { console.error(e); process.exit(1); });

import '@/lib/env';

import { and, eq } from 'drizzle-orm';

import { SURGEON_SEED_RECORDS, type SurgeonSeedRecord } from '@/lib/surgeon-seed-data';
import { db } from '@/server/db';
import { surgeons, surgeonTranslations } from '@/server/db/schema';
import { putStorageObject } from '@/server/oss';

const forceRefresh = process.argv.includes('--force');

async function downloadBuffer(url: string) {
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; hongyu-surgeons-seed/1.0)' } });
  if (!r.ok) throw new Error(`Download failed ${r.status}: ${url}`);
  return Buffer.from(await r.arrayBuffer());
}

async function uploadAvatar(slug: string, url: string) {
  const key = `surgeons/${slug}/avatar.jpg`;
  console.log(`上传头像: ${slug} → ${key}`);
  const buffer = await downloadBuffer(url);
  const result = await putStorageObject(key, buffer, 'image/jpeg');
  if (!result.ok) throw new Error(result.error);
  return result.key;
}

async function upsertSurgeon(record: SurgeonSeedRecord, avatarKey: string) {
  const now = new Date();

  const [existing] = await db.select({ id: surgeons.id }).from(surgeons).where(eq(surgeons.slug, record.slug)).limit(1);
  let surgeonId = existing?.id;

  if (existing) {
    if (!forceRefresh) {
      console.log(`跳过已存在: ${record.slug}`);
      return;
    }
    await db.update(surgeons).set({ avatar: avatarKey, gradeKey: record.gradeKey, sortOrder: record.sortOrder, updatedAt: now }).where(eq(surgeons.id, existing.id));
  } else {
    const [inserted] = await db.insert(surgeons).values({ slug: record.slug, avatar: avatarKey, gradeKey: record.gradeKey, sortOrder: record.sortOrder }).returning({ id: surgeons.id });
    surgeonId = inserted.id;
  }

  if (!surgeonId) throw new Error(`Failed to upsert ${record.slug}`);

  for (const [locale, data] of Object.entries(record.i18n)) {
    const [existT] = await db.select({ id: surgeonTranslations.id }).from(surgeonTranslations)
      .where(and(eq(surgeonTranslations.surgeonId, surgeonId), eq(surgeonTranslations.locale, locale))).limit(1);

    const values = {
      name: data.name,
      position: data.position,
      institution: data.institution,
      expertise: data.expertise,
      experience: data.experience,
      gradeTitle: data.gradeTitle,
      tags: data.tags,
      updatedAt: now,
    };

    if (existT) {
      await db.update(surgeonTranslations).set(values).where(eq(surgeonTranslations.id, existT.id));
    } else {
      await db.insert(surgeonTranslations).values({ surgeonId, locale, ...values });
    }
  }
}

async function main() {
  for (const record of SURGEON_SEED_RECORDS) {
    const avatarKey = await uploadAvatar(record.slug, record.avatarUrl);
    await upsertSurgeon(record, avatarKey);
    console.log(`已写入认证术者: ${record.slug}`);
  }
  console.log('\n认证术者种子数据完成。');
}

main().catch((e) => { console.error(e); process.exit(1); });

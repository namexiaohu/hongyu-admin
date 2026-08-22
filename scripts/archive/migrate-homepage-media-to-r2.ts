import '@/lib/env';

import { eq } from 'drizzle-orm';

import { ensureOssMediaKey, isR2ReadyImageValue } from '@/lib/ensure-oss-image-key';
import {
  compactEducationItems,
  compactMediaSlides,
  type HomepageEducationItem,
  type HomepageMediaSlide,
} from '@/lib/homepage-config';
import { db } from '@/server/db';
import { homepageConfigTranslations, homepageConfigs } from '@/server/db/schema';

async function migrateSlides(
  slides: HomepageMediaSlide[],
  folder: string,
  cache: Map<string, string>,
  label: string,
) {
  const next: HomepageMediaSlide[] = [];
  for (const slide of compactMediaSlides(slides)) {
    if (!slide.url) {
      next.push(slide);
      continue;
    }
    if (isR2ReadyImageValue(slide.url)) {
      next.push(slide);
      continue;
    }
    const cached = cache.get(slide.url);
    const key = cached ?? await ensureOssMediaKey(slide.url, folder);
    cache.set(slide.url, key);
    console.log(`  [${label}] ${slide.url} → ${key}`);
    next.push({ ...slide, url: key });
  }
  return next;
}

async function migrateEducationItems(
  items: HomepageEducationItem[],
  cache: Map<string, string>,
) {
  const next: HomepageEducationItem[] = [];
  for (const item of compactEducationItems(items)) {
    if (!item.coverImage || isR2ReadyImageValue(item.coverImage)) {
      next.push(item);
      continue;
    }
    const cached = cache.get(item.coverImage);
    const coverImage = cached ?? await ensureOssMediaKey(item.coverImage, 'homepage/education');
    cache.set(item.coverImage, coverImage);
    console.log(`  [education] ${item.coverImage} → ${coverImage}`);
    next.push({ ...item, coverImage });
  }
  return next;
}

async function main() {
  const cache = new Map<string, string>();
  const [row] = await db.select().from(homepageConfigs).limit(1);
  if (!row) {
    console.log('无首页配置，跳过。');
    return;
  }

  console.log('迁移首页媒体到 R2…');
  const bannerSlides = await migrateSlides(row.bannerSlides, 'homepage/banner', cache, 'banner');
  const aboutSlides = await migrateSlides(row.aboutSlides, 'homepage/about', cache, 'about');

  await db
    .update(homepageConfigs)
    .set({
      bannerSlides,
      aboutSlides,
      updatedAt: new Date(),
    })
    .where(eq(homepageConfigs.id, row.id));

  const translations = await db
    .select()
    .from(homepageConfigTranslations)
    .where(eq(homepageConfigTranslations.configId, row.id));

  for (const translation of translations) {
    const educationItems = await migrateEducationItems(translation.educationItems, cache);
    await db
      .update(homepageConfigTranslations)
      .set({
        educationItems,
        updatedAt: new Date(),
      })
      .where(eq(homepageConfigTranslations.id, translation.id));
    console.log(`  locale=${translation.locale} education covers updated`);
  }

  console.log('首页媒体 R2 迁移完成。');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

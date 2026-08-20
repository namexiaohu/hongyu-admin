import '@/lib/env';

import { and, eq } from 'drizzle-orm';

import { ensureOssMediaKey, isR2ReadyImageValue } from '@/lib/ensure-oss-image-key';
import {
  compactEducationItems,
  compactMediaSlides,
  getDefaultHomepageAboutSlides,
  getDefaultHomepageBannerSlides,
  getDefaultHomepageTranslationForLocale,
  type HomepageEducationItem,
  type HomepageMediaSlide,
} from '@/lib/homepage-config';
import { db } from '@/server/db';
import { homepageConfigTranslations, homepageConfigs, siteLanguages } from '@/server/db/schema';

async function uploadSlides(
  slides: HomepageMediaSlide[],
  folder: string,
  cache: Map<string, string>,
) {
  const next: HomepageMediaSlide[] = [];
  for (const slide of compactMediaSlides(slides)) {
    if (!slide.url || isR2ReadyImageValue(slide.url)) {
      next.push(slide);
      continue;
    }
    const cached = cache.get(slide.url);
    const key = cached ?? await ensureOssMediaKey(slide.url, folder);
    cache.set(slide.url, key);
    console.log(`[import:r2] ${slide.url} → ${key}`);
    next.push({ ...slide, url: key });
  }
  return next;
}

async function uploadEducationCovers(items: HomepageEducationItem[], cache: Map<string, string>) {
  const next: HomepageEducationItem[] = [];
  for (const item of compactEducationItems(items)) {
    if (!item.coverImage || isR2ReadyImageValue(item.coverImage)) {
      next.push(item);
      continue;
    }
    const cached = cache.get(item.coverImage);
    const coverImage = cached ?? await ensureOssMediaKey(item.coverImage, 'homepage/education');
    cache.set(item.coverImage, coverImage);
    console.log(`[import:r2] ${item.coverImage} → ${coverImage}`);
    next.push({ ...item, coverImage });
  }
  return next;
}

async function ensureConfigRow(cache: Map<string, string>) {
  const bannerSlides = await uploadSlides(getDefaultHomepageBannerSlides(), 'homepage/banner', cache);
  const aboutSlides = await uploadSlides(getDefaultHomepageAboutSlides(), 'homepage/about', cache);

  const [existing] = await db.select().from(homepageConfigs).limit(1);
  if (existing) {
    await db
      .update(homepageConfigs)
      .set({
        bannerSlides,
        aboutSlides,
        updatedAt: new Date(),
      })
      .where(eq(homepageConfigs.id, existing.id));
    return existing.id;
  }

  const [inserted] = await db
    .insert(homepageConfigs)
    .values({
      bannerSlides,
      aboutSlides,
    })
    .returning({ id: homepageConfigs.id });

  if (!inserted) throw new Error('Failed to create homepage_configs row');
  return inserted.id;
}

async function upsertTranslation(configId: string, locale: string, cache: Map<string, string>) {
  const payload = getDefaultHomepageTranslationForLocale(locale);
  const educationItems = await uploadEducationCovers(payload.educationItems, cache);
  const [existing] = await db
    .select({ id: homepageConfigTranslations.id })
    .from(homepageConfigTranslations)
    .where(and(
      eq(homepageConfigTranslations.configId, configId),
      eq(homepageConfigTranslations.locale, locale),
    ))
    .limit(1);

  const values = {
    ...payload,
    educationItems,
    updatedAt: new Date(),
  };

  if (existing) {
    await db
      .update(homepageConfigTranslations)
      .set(values)
      .where(eq(homepageConfigTranslations.id, existing.id));
    console.log(`[import] updated locale=${locale}`);
    return;
  }

  await db.insert(homepageConfigTranslations).values({
    configId,
    locale,
    ...values,
  });
  console.log(`[import] inserted locale=${locale}`);
}

async function main() {
  const cache = new Map<string, string>();
  const configId = await ensureConfigRow(cache);
  console.log(`[import] homepage config id=${configId}`);

  const languages = await db
    .select({ code: siteLanguages.code, isDefault: siteLanguages.isDefault, status: siteLanguages.status })
    .from(siteLanguages);

  const active = languages.filter((row) => row.status === 'active');
  const targets = active.length
    ? active
    : [
        { code: 'en', isDefault: true, status: 'active' },
        { code: 'zh', isDefault: false, status: 'active' },
      ];

  const codes = new Set(targets.map((row) => row.code));
  codes.add('en');
  codes.add('zh');

  for (const code of codes) {
    await upsertTranslation(configId, code, cache);
  }

  console.log('[import] done (media uploaded to R2)');
  process.exit(0);
}

main().catch((error) => {
  console.error('[import] failed', error);
  process.exit(1);
});

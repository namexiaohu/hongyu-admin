import 'server-only';

import { and, eq, inArray } from 'drizzle-orm';

import { ensureOssMediaKey, isR2ReadyImageValue } from '@/lib/ensure-oss-image-key';
import {
  type AdminHomepageConfig,
  type AdminHomepageConfigPutInput,
  type AdminHomepageConfigTranslation,
  adminHomepageConfigPutSchema,
  compactEducationItems,
  compactMediaSlides,
  compactStatItems,
  getDefaultHomepageAboutSlides,
  getDefaultHomepageBannerSlides,
  getDefaultHomepageTranslationForLocale,
  homepageTranslationHasContent,
  type HomepageEducationItem,
  type HomepageMediaSlide,
} from '@/lib/homepage-config';
import { shouldPersistLocaleDraft } from '@/lib/locale-draft-persistence';
import { toOssStorageKey } from '@/lib/oss-asset-url';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { db } from '@/server/db';
import { homepageConfigTranslations, homepageConfigs } from '@/server/db/schema';

function toIso(value: Date) {
  return value.toISOString();
}

function mapTranslation(row: typeof homepageConfigTranslations.$inferSelect): AdminHomepageConfigTranslation {
  return {
    id: row.id,
    configId: row.configId,
    locale: row.locale,
    bannerTitle: row.bannerTitle,
    bannerSubtitle: row.bannerSubtitle,
    bannerDescription: row.bannerDescription,
    solutionsTitle: row.solutionsTitle,
    solutionsDescription: row.solutionsDescription,
    aboutTitle: row.aboutTitle,
    aboutDescription: row.aboutDescription,
    stats: compactStatItems(row.stats),
    globalTitle: row.globalTitle,
    globalDescription: row.globalDescription,
    educationTitle: row.educationTitle,
    educationDescription: row.educationDescription,
    educationItems: compactEducationItems(row.educationItems),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function mapConfig(
  row: typeof homepageConfigs.$inferSelect,
  translations: Array<typeof homepageConfigTranslations.$inferSelect>,
): AdminHomepageConfig {
  return {
    id: row.id,
    bannerSlides: compactMediaSlides(row.bannerSlides),
    aboutSlides: compactMediaSlides(row.aboutSlides),
    translations: translations.map(mapTranslation),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

async function persistMediaUrl(url: string, folder: string) {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (isR2ReadyImageValue(trimmed)) {
    return toOssStorageKey(trimmed) || trimmed.replace(/^\//, '');
  }
  return ensureOssMediaKey(trimmed, folder);
}

async function normalizeSlideUrls(slides: HomepageMediaSlide[], folder: string) {
  return Promise.all(
    compactMediaSlides(slides).map(async (slide) => ({
      ...slide,
      url: await persistMediaUrl(slide.url, folder),
    })),
  );
}

async function normalizeEducationItems(items: HomepageEducationItem[]) {
  return Promise.all(
    compactEducationItems(items).map(async (item) => ({
      ...item,
      coverImage: await persistMediaUrl(item.coverImage, 'homepage/education'),
    })),
  );
}

async function seedDefaultTranslation(configId: string, locale: string) {
  const defaults = getDefaultHomepageTranslationForLocale(locale);
  const educationItems = await normalizeEducationItems(defaults.educationItems);
  await db.insert(homepageConfigTranslations).values({
    configId,
    locale,
    ...defaults,
    educationItems,
  });
}

async function ensureHomepageConfigRow() {
  const [existing] = await db.select().from(homepageConfigs).limit(1);
  if (existing) return existing;

  const bannerSlides = await normalizeSlideUrls(getDefaultHomepageBannerSlides(), 'homepage/banner');
  const aboutSlides = await normalizeSlideUrls(getDefaultHomepageAboutSlides(), 'homepage/about');

  const [inserted] = await db
    .insert(homepageConfigs)
    .values({
      bannerSlides,
      aboutSlides,
    })
    .returning();

  if (!inserted) {
    throw new Error('Failed to create homepage config');
  }

  const defaultLocale = await getDefaultSiteLanguageCode();
  await seedDefaultTranslation(inserted.id, defaultLocale || 'zh');
  if (defaultLocale && defaultLocale !== 'en' && !defaultLocale.startsWith('en')) {
    await seedDefaultTranslation(inserted.id, 'en');
  }
  if (defaultLocale && defaultLocale !== 'zh' && !defaultLocale.startsWith('zh')) {
    await seedDefaultTranslation(inserted.id, 'zh');
  }

  return inserted;
}

export async function getAdminHomepageConfig(): Promise<AdminHomepageConfig> {
  const row = await ensureHomepageConfigRow();
  const translations = await db
    .select()
    .from(homepageConfigTranslations)
    .where(eq(homepageConfigTranslations.configId, row.id));

  if (!translations.length) {
    const defaultLocale = await getDefaultSiteLanguageCode();
    await seedDefaultTranslation(row.id, defaultLocale || 'zh');
    const seeded = await db
      .select()
      .from(homepageConfigTranslations)
      .where(eq(homepageConfigTranslations.configId, row.id));
    return mapConfig(row, seeded);
  }

  return mapConfig(row, translations);
}

export async function updateAdminHomepageConfig(input: unknown): Promise<AdminHomepageConfig> {
  const parsed: AdminHomepageConfigPutInput = adminHomepageConfigPutSchema.parse(input);
  const defaultLocale = await getDefaultSiteLanguageCode();
  const row = await ensureHomepageConfigRow();

  const bannerSlides = await normalizeSlideUrls(parsed.bannerSlides, 'homepage/banner');
  const aboutSlides = await normalizeSlideUrls(parsed.aboutSlides, 'homepage/about');

  await db
    .update(homepageConfigs)
    .set({
      bannerSlides,
      aboutSlides,
      updatedAt: new Date(),
    })
    .where(eq(homepageConfigs.id, row.id));

  const keepLocales: string[] = [];

  for (const translation of parsed.translations) {
    const persist = shouldPersistLocaleDraft({
      locale: translation.locale,
      defaultLocale,
      primaryText: translation.bannerTitle || translation.solutionsTitle || translation.aboutTitle,
    }) || (translation.locale !== defaultLocale && homepageTranslationHasContent(translation));

    if (!persist) continue;
    keepLocales.push(translation.locale);

    const educationItems = await normalizeEducationItems(translation.educationItems);

    const payload = {
      bannerTitle: translation.bannerTitle.trim(),
      bannerSubtitle: translation.bannerSubtitle.trim(),
      bannerDescription: translation.bannerDescription.trim(),
      solutionsTitle: translation.solutionsTitle.trim(),
      solutionsDescription: translation.solutionsDescription.trim(),
      aboutTitle: translation.aboutTitle.trim(),
      aboutDescription: translation.aboutDescription.trim(),
      stats: compactStatItems(translation.stats),
      globalTitle: translation.globalTitle.trim(),
      globalDescription: translation.globalDescription.trim(),
      educationTitle: translation.educationTitle.trim(),
      educationDescription: translation.educationDescription.trim(),
      educationItems,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select({ id: homepageConfigTranslations.id })
      .from(homepageConfigTranslations)
      .where(and(
        eq(homepageConfigTranslations.configId, row.id),
        eq(homepageConfigTranslations.locale, translation.locale),
      ))
      .limit(1);

    if (existing) {
      await db
        .update(homepageConfigTranslations)
        .set(payload)
        .where(eq(homepageConfigTranslations.id, existing.id));
    } else {
      await db.insert(homepageConfigTranslations).values({
        configId: row.id,
        locale: translation.locale,
        ...payload,
      });
    }
  }

  const existingRows = await db
    .select({ id: homepageConfigTranslations.id, locale: homepageConfigTranslations.locale })
    .from(homepageConfigTranslations)
    .where(eq(homepageConfigTranslations.configId, row.id));

  const staleIds = existingRows
    .filter((item) => !keepLocales.includes(item.locale))
    .map((item) => item.id);

  if (staleIds.length) {
    await db.delete(homepageConfigTranslations).where(inArray(homepageConfigTranslations.id, staleIds));
  }

  return getAdminHomepageConfig();
}

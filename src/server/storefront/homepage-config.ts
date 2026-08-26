import 'server-only';

import { eq } from 'drizzle-orm';

import {
  EMPTY_STOREFRONT_HOMEPAGE,
  type StorefrontHomepageConfig,
  compactEducationItems,
  compactMediaSlides,
  compactSolutionItems,
  compactStatItems,
} from '@/lib/homepage-config';
import { resolveOssAssetUrl } from '@/lib/oss-asset-url';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { db } from '@/server/db';
import { homepageConfigTranslations, homepageConfigs } from '@/server/db/schema';

function resolveSlideUrl(url: string) {
  return resolveOssAssetUrl(url);
}

export async function getStorefrontHomepageConfig(locale: string): Promise<StorefrontHomepageConfig> {
  const [row] = await db.select().from(homepageConfigs).limit(1);
  const defaultLocale = await getDefaultSiteLanguageCode();

  if (!row) {
    return { ...EMPTY_STOREFRONT_HOMEPAGE, locale: locale || defaultLocale };
  }

  const translations = await db
    .select()
    .from(homepageConfigTranslations)
    .where(eq(homepageConfigTranslations.configId, row.id));

  const display = pickTranslationForDisplay(translations, locale)
    ?? pickTranslationForDisplay(translations, defaultLocale);

  return {
    locale: display?.locale ?? locale ?? defaultLocale,
    bannerSlides: compactMediaSlides(row.bannerSlides).map((slide) => ({
      ...slide,
      url: resolveSlideUrl(slide.url),
    })),
    aboutSlides: compactMediaSlides(row.aboutSlides).map((slide) => ({
      ...slide,
      url: resolveSlideUrl(slide.url),
    })),
    bannerTitle: display?.bannerTitle ?? '',
    bannerSubtitle: display?.bannerSubtitle ?? '',
    bannerDescription: display?.bannerDescription ?? '',
    solutionsTitle: display?.solutionsTitle ?? '',
    solutionsDescription: display?.solutionsDescription ?? '',
    aboutTitle: display?.aboutTitle ?? '',
    aboutDescription: display?.aboutDescription ?? '',
    stats: compactStatItems(display?.stats),
    globalTitle: display?.globalTitle ?? '',
    globalDescription: display?.globalDescription ?? '',
    educationTitle: display?.educationTitle ?? '',
    educationDescription: display?.educationDescription ?? '',
    educationItems: compactEducationItems(display?.educationItems).map((item) => ({
      ...item,
      coverImage: resolveSlideUrl(item.coverImage),
    })),
    solutionItems: compactSolutionItems(display?.solutionItems).map((item) => ({
      ...item,
      coverImage: resolveSlideUrl(item.coverImage),
    })),
  };
}

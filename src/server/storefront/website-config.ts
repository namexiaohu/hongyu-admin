import 'server-only';

import {
  EMPTY_STOREFRONT_WEBSITE_CONFIG,
  type StorefrontWebsiteConfig,
  compactNavColumns,
  compactPrivacyPreferenceConfig,
  resolveAdminFooterNavColumns,
  resolveStorefrontNavColumns,
  resolveStorefrontPrivacyPreference,
} from '@/lib/website-config';
import { compactListHeroBoards, resolveStorefrontListHeroBoards } from '@/lib/list-hero-board';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { db } from '@/server/db';
import { websiteConfigs } from '@/server/db/schema';

export async function getStorefrontWebsiteConfig(locale: string): Promise<StorefrontWebsiteConfig> {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const [row] = await db.select().from(websiteConfigs).limit(1);
  const resolvedLocale = locale || defaultLocale;
  const listHeroBoards = resolveStorefrontListHeroBoards(compactListHeroBoards(row?.listHeroBoards));

  if (!row) {
    return {
      ...EMPTY_STOREFRONT_WEBSITE_CONFIG,
      locale: resolvedLocale,
      listHeroBoards,
    };
  }

  const headerRaw = compactNavColumns(row.navColumns);
  const footerRaw = resolveAdminFooterNavColumns(headerRaw, row.footerNavColumns);

  return {
    locale: resolvedLocale,
    headerNavColumns: resolveStorefrontNavColumns(headerRaw, resolvedLocale),
    footerNavColumns: resolveStorefrontNavColumns(footerRaw, resolvedLocale),
    listHeroBoards,
    privacyPreference: resolveStorefrontPrivacyPreference(
      compactPrivacyPreferenceConfig(row.privacyPreference),
      resolvedLocale,
    ),
  };
}

export function getEmptyStorefrontWebsiteConfig(locale = ''): StorefrontWebsiteConfig {
  return { ...EMPTY_STOREFRONT_WEBSITE_CONFIG, locale };
}

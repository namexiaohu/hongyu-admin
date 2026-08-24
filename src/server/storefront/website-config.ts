import 'server-only';

import {
  EMPTY_STOREFRONT_WEBSITE_CONFIG,
  type StorefrontWebsiteConfig,
  compactNavColumns,
  resolveNavName,
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

  if (!row?.navColumns?.length) {
    return {
      ...EMPTY_STOREFRONT_WEBSITE_CONFIG,
      locale: resolvedLocale,
      listHeroBoards,
    };
  }

  const columns = compactNavColumns(row.navColumns);

  return {
    locale: resolvedLocale,
    navColumns: columns.map((column) => ({
      id: column.id,
      name: resolveNavName(column, resolvedLocale),
      items: column.items.map((item) => ({
        id: item.id,
        href: item.href,
        name: resolveNavName(item, resolvedLocale),
      })).filter((item) => item.name && item.href),
    })).filter((column) => column.name && column.items.length),
    listHeroBoards,
  };
}

export function getEmptyStorefrontWebsiteConfig(locale = ''): StorefrontWebsiteConfig {
  return { ...EMPTY_STOREFRONT_WEBSITE_CONFIG, locale };
}

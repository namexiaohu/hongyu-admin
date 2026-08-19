import 'server-only';

import { asc, eq, inArray } from 'drizzle-orm';

import { resolveOssAssetUrl } from '@/lib/oss-asset-url';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import type { CenterRegion } from '@/lib/partner-center-content';
import { centerRegions } from '@/lib/partner-center-content';
import { db } from '@/server/db';
import { partnerCenters, partnerCenterTranslations } from '@/server/db/schema';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';

export type StorefrontCenterItem = {
  slug: string;
  coverImage: string;
  logo: string;
  region: CenterRegion;
  name: string;
  description: string;
  location: string;
  badgeText: string;
  address: string;
  businessHours: string;
  contact: string;
  website: string;
  tags: string[];
};

export type StorefrontCenterGroup = {
  region: CenterRegion;
  regionLabel: string;
  count: number;
  items: StorefrontCenterItem[];
};

export type StorefrontPartnerCentersResponse = {
  locale: string;
  groups: StorefrontCenterGroup[];
};

const regionLabelsZh: Record<CenterRegion, string> = {
  'asia-pacific': '亚太地区',
  'europe': '欧洲',
  'north-america': '北美',
  'latin-america': '拉丁美洲',
  'middle-east-africa': '中东与非洲',
  'oceania': '大洋洲',
};

const regionLabelsEn: Record<CenterRegion, string> = {
  'asia-pacific': 'Asia Pacific',
  'europe': 'Europe',
  'north-america': 'North America',
  'latin-america': 'Latin America',
  'middle-east-africa': 'Middle East & Africa',
  'oceania': 'Oceania',
};

function resolveRegionLabel(region: CenterRegion, locale: string): string {
  if (locale.startsWith('zh')) return regionLabelsZh[region];
  return regionLabelsEn[region];
}

export async function getStorefrontPartnerCentersList(input: { locale: string }): Promise<StorefrontPartnerCentersResponse> {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const rows = await db.select().from(partnerCenters).orderBy(asc(partnerCenters.sortOrder), asc(partnerCenters.slug));

  const ids = rows.map((r) => r.id);
  const translations = ids.length
    ? await db.select().from(partnerCenterTranslations).where(inArray(partnerCenterTranslations.centerId, ids))
    : [];

  const byId = new Map<string, (typeof partnerCenterTranslations.$inferSelect)[]>();
  for (const t of translations) {
    const b = byId.get(t.centerId) ?? [];
    b.push(t);
    byId.set(t.centerId, b);
  }

  const itemsByRegion = new Map<CenterRegion, StorefrontCenterItem[]>();

  for (const row of rows) {
    const rowT = byId.get(row.id) ?? [];
    const localeMatch = rowT.find((t) => t.locale.toLowerCase() === input.locale.toLowerCase());
    const display = localeMatch ?? pickTranslationForDisplay(rowT, defaultLocale);

    const item: StorefrontCenterItem = {
      slug: row.slug,
      coverImage: resolveOssAssetUrl(row.coverImage),
      logo: resolveOssAssetUrl(row.logo),
      region: row.region as CenterRegion,
      name: display?.name ?? row.slug,
      description: display?.description ?? '',
      location: display?.location ?? '',
      badgeText: display?.badgeText ?? '',
      address: display?.address ?? '',
      businessHours: display?.businessHours ?? '',
      contact: display?.contact ?? '',
      website: display?.website ?? '',
      tags: ((display?.tags ?? []) as string[]).filter(Boolean),
    };

    const bucket = itemsByRegion.get(row.region as CenterRegion) ?? [];
    bucket.push(item);
    itemsByRegion.set(row.region as CenterRegion, bucket);
  }

  const groups: StorefrontCenterGroup[] = centerRegions
    .filter((r) => itemsByRegion.has(r))
    .map((r) => {
      const items = itemsByRegion.get(r) ?? [];
      return { region: r, regionLabel: resolveRegionLabel(r, input.locale), count: items.length, items };
    });

  return { locale: input.locale, groups };
}

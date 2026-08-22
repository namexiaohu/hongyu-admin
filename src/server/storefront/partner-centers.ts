import 'server-only';

import { and, asc, eq, inArray, ne } from 'drizzle-orm';

import { resolveOssAssetUrl, rewriteHtmlOssAssets } from '@/lib/oss-asset-url';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import type { CenterRegion, PartnerCenterMetric } from '@/lib/partner-center-content';
import { centerRegions, normalizePartnerCenterMetrics } from '@/lib/partner-center-content';
import {
  type PartnerCenterBackgroundMode,
  resolvePartnerCenterBackgroundDisplay,
} from '@/lib/partner-center-background-presets';
import { resolveStorefrontCoverUrl } from '@/lib/cover-presets';
import { resolveUploadStorageKey } from '@/lib/upload-storage-key';
import type { SurgeonGradeKey } from '@/lib/surgeon-content';
import { db } from '@/server/db';
import {
  partnerCenters,
  partnerCenterSurgeons,
  partnerCenterTranslations,
  surgeons,
  surgeonTranslations,
} from '@/server/db/schema';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';

export type StorefrontCenterItem = {
  slug: string;
  coverImage: string;
  gallery: Array<{ url: string; alt: string }>;
  videoUrl: string;
  logo: string;
  backgroundMode: PartnerCenterBackgroundMode;
  backgroundImage: string;
  backgroundSolidCss: string;
  showCoverOnBackground: boolean;
  region: CenterRegion;
  email: string;
  website: string;
  name: string;
  description: string;
  detailDescription: string;
  location: string;
  badgeText: string;
  address: string;
  businessHours: string;
  contact: string;
  tags: string[];
  stats: PartnerCenterMetric[];
  cooperationInfo: PartnerCenterMetric[];
};

export type StorefrontCenterSurgeon = {
  slug: string;
  avatar: string;
  name: string;
  position: string;
  gradeKey: SurgeonGradeKey;
  gradeTitle: string;
  certificationYear: number | null;
  surgeryCount: number | null;
};

export type StorefrontRelatedCenter = {
  slug: string;
  coverImage: string;
  name: string;
  location: string;
};

export type StorefrontCenterDetail = StorefrontCenterItem & {
  regionLabel: string;
  surgeons: StorefrontCenterSurgeon[];
  relatedCenters: StorefrontRelatedCenter[];
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

function shuffleIds<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function mapCenterItem(
  row: typeof partnerCenters.$inferSelect,
  display: typeof partnerCenterTranslations.$inferSelect | null | undefined,
): StorefrontCenterItem {
  const mode = row.backgroundMode ?? '';
  const value = row.backgroundValue ?? '';
  let uploadUrl = '';
  if (mode === 'upload' && value) {
    const key = resolveUploadStorageKey(value, row.backgroundImage);
    uploadUrl = key ? resolveOssAssetUrl(key) : '';
  }

  const bg = resolvePartnerCenterBackgroundDisplay({
    mode,
    value,
    uploadUrl,
    legacyBackgroundImage: row.backgroundImage ? resolveOssAssetUrl(row.backgroundImage) : '',
    fallbackSolidWhenEmpty: true,
  });

  return {
    slug: row.slug,
    coverImage: resolveStorefrontCoverUrl({
      mode: row.coverMode,
      value: row.coverValue,
      legacyCoverImageKey: row.coverImage,
      toPublicUrl: resolveOssAssetUrl,
    }),
    gallery: ((row.gallery ?? []) as Array<{ url?: string; alt?: string }>)
      .map((item) => ({
        url: item.url?.trim() ? resolveOssAssetUrl(item.url) : '',
        alt: item.alt?.trim() || display?.name || row.slug,
      }))
      .filter((item) => item.url),
    videoUrl: row.videoUrl?.trim() ? resolveOssAssetUrl(row.videoUrl) : '',
    logo: resolveOssAssetUrl(row.logo),
    backgroundMode: bg.mode,
    backgroundImage: bg.imageUrl,
    backgroundSolidCss: bg.solidCss,
    showCoverOnBackground: Boolean(row.showCoverOnBackground),
    region: row.region as CenterRegion,
    email: row.email ?? '',
    website: (row.website || display?.website || '').trim(),
    name: display?.name ?? row.slug,
    description: display?.description ?? '',
    detailDescription: rewriteHtmlOssAssets(display?.detailDescription ?? '', 'toPublicUrl'),
    location: display?.location ?? '',
    badgeText: display?.badgeText ?? '',
    address: display?.address ?? '',
    businessHours: display?.businessHours ?? '',
    contact: display?.contact ?? '',
    tags: ((display?.tags ?? []) as string[]).filter(Boolean),
    stats: normalizePartnerCenterMetrics((display?.stats ?? []) as PartnerCenterMetric[]),
    cooperationInfo: normalizePartnerCenterMetrics((display?.cooperationInfo ?? []) as PartnerCenterMetric[]),
  };
}

async function loadCenterSurgeons(input: {
  centerId: string;
  locale: string;
  defaultLocale: string;
}): Promise<StorefrontCenterSurgeon[]> {
  const links = await db
    .select({
      surgeonId: partnerCenterSurgeons.surgeonId,
      sortOrder: partnerCenterSurgeons.sortOrder,
    })
    .from(partnerCenterSurgeons)
    .where(eq(partnerCenterSurgeons.centerId, input.centerId))
    .orderBy(asc(partnerCenterSurgeons.sortOrder));

  if (!links.length) return [];

  const surgeonIds = links.map((l) => l.surgeonId);
  const rows = await db.select().from(surgeons).where(inArray(surgeons.id, surgeonIds));
  const translations = await db
    .select()
    .from(surgeonTranslations)
    .where(inArray(surgeonTranslations.surgeonId, surgeonIds));

  const byId = new Map(rows.map((row) => [row.id, row]));
  const translationsById = new Map<string, (typeof surgeonTranslations.$inferSelect)[]>();
  for (const t of translations) {
    const bucket = translationsById.get(t.surgeonId) ?? [];
    bucket.push(t);
    translationsById.set(t.surgeonId, bucket);
  }

  return links.flatMap((link) => {
    const row = byId.get(link.surgeonId);
    if (!row) return [];
    const rowT = translationsById.get(link.surgeonId) ?? [];
    const localeMatch = rowT.find((t) => t.locale.toLowerCase() === input.locale.toLowerCase());
    const display = localeMatch ?? pickTranslationForDisplay(rowT, input.defaultLocale);
    return [{
      slug: row.slug,
      avatar: resolveOssAssetUrl(row.avatar),
      name: display?.name ?? row.slug,
      position: display?.position ?? '',
      gradeKey: row.gradeKey as SurgeonGradeKey,
      gradeTitle: display?.gradeTitle ?? '',
      certificationYear: row.certificationYear ?? null,
      surgeryCount: row.surgeryCount ?? null,
    }];
  });
}

async function loadRelatedCenters(input: {
  centerId: string;
  region: CenterRegion;
  locale: string;
  defaultLocale: string;
  limit?: number;
}): Promise<StorefrontRelatedCenter[]> {
  const limit = input.limit ?? 2;
  const peers = await db
    .select()
    .from(partnerCenters)
    .where(and(
      eq(partnerCenters.region, input.region),
      ne(partnerCenters.id, input.centerId),
    ));

  if (!peers.length) return [];

  const picked = shuffleIds(peers).slice(0, limit);
  const ids = picked.map((row) => row.id);
  const translations = await db
    .select()
    .from(partnerCenterTranslations)
    .where(inArray(partnerCenterTranslations.centerId, ids));

  const byId = new Map<string, (typeof partnerCenterTranslations.$inferSelect)[]>();
  for (const t of translations) {
    const bucket = byId.get(t.centerId) ?? [];
    bucket.push(t);
    byId.set(t.centerId, bucket);
  }

  return picked.map((row) => {
    const rowT = byId.get(row.id) ?? [];
    const localeMatch = rowT.find((t) => t.locale.toLowerCase() === input.locale.toLowerCase());
    const display = localeMatch ?? pickTranslationForDisplay(rowT, input.defaultLocale);
    return {
      slug: row.slug,
      coverImage: resolveStorefrontCoverUrl({
        mode: row.coverMode,
        value: row.coverValue,
        legacyCoverImageKey: row.coverImage,
        toPublicUrl: resolveOssAssetUrl,
      }),
      name: display?.name ?? row.slug,
      location: display?.location ?? '',
    };
  });
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
    const item = mapCenterItem(row, display);

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

export async function getStorefrontPartnerCenterBySlug(input: {
  slug: string;
  locale: string;
}): Promise<StorefrontCenterDetail | null> {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const [row] = await db.select().from(partnerCenters).where(eq(partnerCenters.slug, input.slug)).limit(1);
  if (!row) return null;

  const translations = await db
    .select()
    .from(partnerCenterTranslations)
    .where(eq(partnerCenterTranslations.centerId, row.id));

  const localeMatch = translations.find((t) => t.locale.toLowerCase() === input.locale.toLowerCase());
  const display = localeMatch ?? pickTranslationForDisplay(translations, defaultLocale);
  const region = row.region as CenterRegion;

  const [surgeonsList, relatedCenters] = await Promise.all([
    loadCenterSurgeons({
      centerId: row.id,
      locale: input.locale,
      defaultLocale,
    }),
    loadRelatedCenters({
      centerId: row.id,
      region,
      locale: input.locale,
      defaultLocale,
    }),
  ]);

  return {
    ...mapCenterItem(row, display),
    regionLabel: resolveRegionLabel(region, input.locale),
    surgeons: surgeonsList,
    relatedCenters,
  };
}

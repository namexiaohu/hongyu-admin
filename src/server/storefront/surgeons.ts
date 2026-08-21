import 'server-only';

import { and, asc, eq, inArray, ne } from 'drizzle-orm';

import { resolveOssAssetUrl, rewriteHtmlOssAssets } from '@/lib/oss-asset-url';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import type { SurgeonGradeKey, SurgeonMetric } from '@/lib/surgeon-content';
import { normalizeSurgeonMetrics } from '@/lib/surgeon-content';
import { db } from '@/server/db';
import {
  partnerCenters,
  partnerCenterSurgeons,
  partnerCenterTranslations,
  surgeons,
  surgeonTranslations,
} from '@/server/db/schema';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';

export type StorefrontSurgeonPartnerCenter = {
  slug: string;
  name: string;
  badgeText: string;
};

export type StorefrontSurgeonItem = {
  slug: string;
  avatar: string;
  gradeKey: SurgeonGradeKey;
  certificationYear: number | null;
  surgeryCount: number | null;
  name: string;
  position: string;
  institution: string;
  expertise: string;
  experience: string;
  gradeTitle: string;
  tags: string[];
};

export type StorefrontRelatedSurgeon = {
  slug: string;
  avatar: string;
  name: string;
  position: string;
  gradeKey: SurgeonGradeKey;
  gradeTitle: string;
};

export type StorefrontSurgeonDetail = StorefrontSurgeonItem & {
  detailDescription: string;
  otherCertifications: SurgeonMetric[];
  specialties: string[];
  partnerCenters: StorefrontSurgeonPartnerCenter[];
  relatedSurgeons: StorefrontRelatedSurgeon[];
};

function shuffleIds<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export type StorefrontSurgeonsListResponse = {
  locale: string;
  items: StorefrontSurgeonItem[];
};

function mapListItem(
  row: typeof surgeons.$inferSelect,
  display: typeof surgeonTranslations.$inferSelect | null | undefined,
): StorefrontSurgeonItem {
  return {
    slug: row.slug,
    avatar: resolveOssAssetUrl(row.avatar),
    gradeKey: row.gradeKey as SurgeonGradeKey,
    certificationYear: row.certificationYear ?? null,
    surgeryCount: row.surgeryCount ?? null,
    name: display?.name ?? row.slug,
    position: display?.position ?? '',
    institution: display?.institution ?? '',
    expertise: display?.expertise ?? '',
    experience: display?.experience ?? '',
    gradeTitle: display?.gradeTitle ?? '',
    tags: ((display?.tags ?? []) as string[]).filter(Boolean),
  };
}

async function loadPartnerCentersForSurgeon(
  surgeonId: string,
  locale: string,
  defaultLocale: string,
): Promise<StorefrontSurgeonPartnerCenter[]> {
  const links = await db
    .select({
      centerId: partnerCenterSurgeons.centerId,
      sortOrder: partnerCenterSurgeons.sortOrder,
      slug: partnerCenters.slug,
      centerSort: partnerCenters.sortOrder,
    })
    .from(partnerCenterSurgeons)
    .innerJoin(partnerCenters, eq(partnerCenters.id, partnerCenterSurgeons.centerId))
    .where(eq(partnerCenterSurgeons.surgeonId, surgeonId))
    .orderBy(asc(partnerCenterSurgeons.sortOrder), asc(partnerCenters.sortOrder), asc(partnerCenters.slug));

  if (!links.length) return [];

  const centerIds = links.map((l) => l.centerId);
  const translations = await db
    .select()
    .from(partnerCenterTranslations)
    .where(inArray(partnerCenterTranslations.centerId, centerIds));

  const byCenter = new Map<string, (typeof partnerCenterTranslations.$inferSelect)[]>();
  for (const t of translations) {
    const bucket = byCenter.get(t.centerId) ?? [];
    bucket.push(t);
    byCenter.set(t.centerId, bucket);
  }

  return links.map((link) => {
    const rowT = byCenter.get(link.centerId) ?? [];
    const localeMatch = rowT.find((t) => t.locale.toLowerCase() === locale.toLowerCase());
    const display = localeMatch ?? pickTranslationForDisplay(rowT, defaultLocale);
    return {
      slug: link.slug,
      name: display?.name ?? link.slug,
      badgeText: display?.badgeText ?? '',
    };
  });
}

async function loadRelatedSurgeons(input: {
  surgeonId: string;
  locale: string;
  defaultLocale: string;
  limit?: number;
}): Promise<StorefrontRelatedSurgeon[]> {
  const limit = input.limit ?? 3;
  const centerRows = await db
    .select({ centerId: partnerCenterSurgeons.centerId })
    .from(partnerCenterSurgeons)
    .where(eq(partnerCenterSurgeons.surgeonId, input.surgeonId));

  if (!centerRows.length) return [];

  const centerIds = centerRows.map((row) => row.centerId);
  const peerLinks = await db
    .select({ surgeonId: partnerCenterSurgeons.surgeonId })
    .from(partnerCenterSurgeons)
    .where(and(
      inArray(partnerCenterSurgeons.centerId, centerIds),
      ne(partnerCenterSurgeons.surgeonId, input.surgeonId),
    ));

  const uniqueIds = [...new Set(peerLinks.map((row) => row.surgeonId))];
  if (!uniqueIds.length) return [];

  const pickedIds = shuffleIds(uniqueIds).slice(0, limit);
  const rows = await db.select().from(surgeons).where(inArray(surgeons.id, pickedIds));
  if (!rows.length) return [];

  const translations = await db
    .select()
    .from(surgeonTranslations)
    .where(inArray(surgeonTranslations.surgeonId, pickedIds));

  const byId = new Map<string, (typeof surgeonTranslations.$inferSelect)[]>();
  for (const t of translations) {
    const bucket = byId.get(t.surgeonId) ?? [];
    bucket.push(t);
    byId.set(t.surgeonId, bucket);
  }

  const bySurgeonId = new Map(rows.map((row) => [row.id, row]));
  return pickedIds.flatMap((id) => {
    const row = bySurgeonId.get(id);
    if (!row) return [];
    const rowT = byId.get(id) ?? [];
    const localeMatch = rowT.find((t) => t.locale.toLowerCase() === input.locale.toLowerCase());
    const display = localeMatch ?? pickTranslationForDisplay(rowT, input.defaultLocale);
    return [{
      slug: row.slug,
      avatar: resolveOssAssetUrl(row.avatar),
      name: display?.name ?? row.slug,
      position: display?.position ?? '',
      gradeKey: row.gradeKey as SurgeonGradeKey,
      gradeTitle: display?.gradeTitle ?? '',
    }];
  });
}

export async function getStorefrontSurgeonsList(input: { locale: string }): Promise<StorefrontSurgeonsListResponse> {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const rows = await db.select().from(surgeons).orderBy(asc(surgeons.sortOrder), asc(surgeons.slug));

  const ids = rows.map((r) => r.id);
  const translations = ids.length
    ? await db.select().from(surgeonTranslations).where(inArray(surgeonTranslations.surgeonId, ids))
    : [];

  const byId = new Map<string, (typeof surgeonTranslations.$inferSelect)[]>();
  for (const t of translations) {
    const b = byId.get(t.surgeonId) ?? [];
    b.push(t);
    byId.set(t.surgeonId, b);
  }

  const items: StorefrontSurgeonItem[] = rows.map((row) => {
    const rowT = byId.get(row.id) ?? [];
    const localeMatch = rowT.find((t) => t.locale.toLowerCase() === input.locale.toLowerCase());
    const display = localeMatch ?? pickTranslationForDisplay(rowT, defaultLocale);
    return mapListItem(row, display);
  });

  return { locale: input.locale, items };
}

export async function getStorefrontSurgeonBySlug(input: {
  slug: string;
  locale: string;
}): Promise<StorefrontSurgeonDetail | null> {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const [row] = await db.select().from(surgeons).where(eq(surgeons.slug, input.slug)).limit(1);
  if (!row) return null;

  const translations = await db
    .select()
    .from(surgeonTranslations)
    .where(eq(surgeonTranslations.surgeonId, row.id));

  const localeMatch = translations.find((t) => t.locale.toLowerCase() === input.locale.toLowerCase());
  const display = localeMatch ?? pickTranslationForDisplay(translations, defaultLocale);
  const [partnerCenters, relatedSurgeons] = await Promise.all([
    loadPartnerCentersForSurgeon(row.id, input.locale, defaultLocale),
    loadRelatedSurgeons({
      surgeonId: row.id,
      locale: input.locale,
      defaultLocale,
    }),
  ]);

  return {
    ...mapListItem(row, display),
    detailDescription: rewriteHtmlOssAssets(display?.detailDescription ?? '', 'toPublicUrl'),
    otherCertifications: normalizeSurgeonMetrics((display?.otherCertifications ?? []) as SurgeonMetric[]),
    specialties: ((display?.specialties ?? []) as string[]).filter(Boolean),
    partnerCenters,
    relatedSurgeons,
  };
}

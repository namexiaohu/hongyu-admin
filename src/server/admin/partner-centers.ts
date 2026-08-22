import 'server-only';

import { and, asc, desc, eq, inArray } from 'drizzle-orm';

import {
  normalizeBackgroundWrite,
  resolveAdminBackgroundPreview,
} from '@/lib/partner-center-background-presets';
import { resolveAdminCoverPreview } from '@/lib/cover-presets';
import { resolveOssAssetUrl, toOssStorageKey } from '@/lib/oss-asset-url';
import {
  type AdminPartnerCenterDetail,
  type AdminPartnerCenterListItem,
  type AdminPartnerCenterTranslation,
  type CenterRegion,
  type PartnerCenterMetric,
  adminPartnerCenterCreateSchema,
  adminPartnerCenterPatchSchema,
  adminPartnerCenterTranslationSchema,
  normalizePartnerCenterMetrics,
  resolveCenterDisplayName,
} from '@/lib/partner-center-content';
import type { ProductGalleryImage } from '@/lib/product-content';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { normalizeSlug } from '@/lib/slug';
import { resolveCoverFieldsForWrite } from '@/server/admin/cover-images';
import { normalizeHeroCopyStyleForWrite } from '@/lib/hero-copy-style';
import { db } from '@/server/db';
import { partnerCenters, partnerCenterSurgeons, partnerCenterTranslations } from '@/server/db/schema';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';

function toIso(value: Date) {
  return value.toISOString();
}

function normalizeGallery(gallery: ProductGalleryImage[] | undefined): ProductGalleryImage[] {
  if (!gallery?.length) return [];
  return gallery
    .map((item) => ({
      url: toOssStorageKey(item.url.trim()),
      alt: item.alt?.trim() ?? '',
      width: item.width ?? null,
      height: item.height ?? null,
    }))
    .filter((item) => item.url);
}

function normalizeVideoUrl(value: string | undefined): string {
  const trimmed = value?.trim() ?? '';
  return trimmed ? toOssStorageKey(trimmed) : '';
}

function mapListItem(
  row: typeof partnerCenters.$inferSelect,
  name: string,
  localeCount: number,
): AdminPartnerCenterListItem {
  const bg = resolveAdminBackgroundPreview({
    mode: row.backgroundMode ?? '',
    value: row.backgroundValue ?? '',
    legacyBackgroundImageKey: row.backgroundImage ?? '',
    toPublicUrl: resolveOssAssetUrl,
  });
  const cover = resolveAdminCoverPreview({
    mode: row.coverMode ?? '',
    value: row.coverValue ?? '',
    legacyCoverImageKey: row.coverImage ?? '',
    toPublicUrl: resolveOssAssetUrl,
  });

  return {
    id: row.id,
    slug: row.slug,
    region: row.region as CenterRegion,
    email: row.email ?? '',
    website: row.website ?? '',
    coverImage: row.coverImage,
    coverMode: cover.mode,
    coverValue: cover.value,
    coverPreviewUrl: cover.previewUrl,
    gallery: (row.gallery ?? []) as ProductGalleryImage[],
    videoUrl: row.videoUrl ?? '',
    logo: row.logo,
    backgroundImage: row.backgroundImage ?? '',
    backgroundMode: bg.mode,
    backgroundValue: bg.value,
    backgroundPreviewUrl: bg.previewUrl,
    showCoverOnBackground: Boolean(row.showCoverOnBackground),
    heroCopyStyle: (row.heroCopyStyle as import('@/lib/hero-copy-style').HeroCopyStyle | null) ?? null,
    sortOrder: row.sortOrder,
    name,
    localeCount,
    updatedAt: toIso(row.updatedAt),
  };
}

function mapTranslation(row: typeof partnerCenterTranslations.$inferSelect): AdminPartnerCenterTranslation {
  return {
    id: row.id,
    centerId: row.centerId,
    locale: row.locale,
    name: row.name,
    description: row.description,
    detailDescription: row.detailDescription ?? '',
    location: row.location,
    badgeText: row.badgeText,
    address: row.address,
    businessHours: row.businessHours,
    contact: row.contact,
    tags: (row.tags ?? []) as string[],
    stats: normalizePartnerCenterMetrics((row.stats ?? []) as PartnerCenterMetric[]),
    cooperationInfo: normalizePartnerCenterMetrics((row.cooperationInfo ?? []) as PartnerCenterMetric[]),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

async function loadSurgeonIds(centerId: string) {
  const rows = await db
    .select({ surgeonId: partnerCenterSurgeons.surgeonId })
    .from(partnerCenterSurgeons)
    .where(eq(partnerCenterSurgeons.centerId, centerId))
    .orderBy(asc(partnerCenterSurgeons.sortOrder), asc(partnerCenterSurgeons.surgeonId));
  return rows.map((row) => row.surgeonId);
}

async function syncPartnerCenterSurgeons(centerId: string, surgeonIds: string[]) {
  const uniqueIds = [...new Set(surgeonIds.filter(Boolean))];
  await db.delete(partnerCenterSurgeons).where(eq(partnerCenterSurgeons.centerId, centerId));
  if (!uniqueIds.length) return;
  await db.insert(partnerCenterSurgeons).values(
    uniqueIds.map((surgeonId, index) => ({
      centerId,
      surgeonId,
      sortOrder: (index + 1) * 10,
    })),
  );
}

async function mapDetail(
  row: typeof partnerCenters.$inferSelect,
  translations: Array<typeof partnerCenterTranslations.$inferSelect>,
  defaultLocale: string,
): Promise<AdminPartnerCenterDetail> {
  const display = pickTranslationForDisplay(translations, defaultLocale);
  return {
    ...mapListItem(row, resolveCenterDisplayName(display, row.slug), translations.length),
    translations: translations.map(mapTranslation),
    surgeonIds: await loadSurgeonIds(row.id),
  };
}

export async function getAdminPartnerCenterList() {
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

  const items = rows.map((row) => {
    const rowT = byId.get(row.id) ?? [];
    const display = pickTranslationForDisplay(rowT, defaultLocale);
    return mapListItem(row, resolveCenterDisplayName(display, row.slug), rowT.length);
  });

  return { items, total: items.length };
}

export async function getAdminPartnerCenterDetail(id: string): Promise<AdminPartnerCenterDetail | null> {
  const [row] = await db.select().from(partnerCenters).where(eq(partnerCenters.id, id)).limit(1);
  if (!row) return null;
  const translations = await db
    .select().from(partnerCenterTranslations)
    .where(eq(partnerCenterTranslations.centerId, id))
    .orderBy(asc(partnerCenterTranslations.locale));
  const defaultLocale = await getDefaultSiteLanguageCode();
  return mapDetail(row, translations, defaultLocale);
}

export async function createAdminPartnerCenter(input: unknown) {
  const parsed = adminPartnerCenterCreateSchema.parse(input);
  const slug = normalizeSlug(parsed.slug);
  if (!slug) throw new Error('SLUG_INVALID');

  const [existing] = await db.select({ id: partnerCenters.id }).from(partnerCenters).where(eq(partnerCenters.slug, slug)).limit(1);
  if (existing) throw new Error('SLUG_EXISTS');

  const [maxSort] = await db.select({ sortOrder: partnerCenters.sortOrder }).from(partnerCenters).orderBy(desc(partnerCenters.sortOrder)).limit(1);
  const bg = normalizeBackgroundWrite(parsed.backgroundMode, parsed.backgroundValue);

  const cover = await resolveCoverFieldsForWrite({
    coverMode: parsed.coverMode,
    coverValue: parsed.coverValue,
  });

  const [inserted] = await db.insert(partnerCenters).values({
    slug,
    region: parsed.region ?? 'asia-pacific',
    email: parsed.email?.trim() ?? '',
    website: parsed.website?.trim() ?? '',
    coverImage: cover.coverImage,
    coverMode: cover.coverMode,
    coverValue: cover.coverValue,
    gallery: normalizeGallery(parsed.gallery),
    videoUrl: normalizeVideoUrl(parsed.videoUrl),
    logo: toOssStorageKey(parsed.logo ?? ''),
    backgroundMode: bg.backgroundMode,
    backgroundValue: bg.backgroundValue,
    backgroundImage: bg.backgroundImage,
    showCoverOnBackground: parsed.showCoverOnBackground ?? true,
    heroCopyStyle: normalizeHeroCopyStyleForWrite(parsed.heroCopyStyle) ?? 'light',
    sortOrder: parsed.sortOrder ?? (maxSort?.sortOrder ?? 0) + 10,
  }).returning({ id: partnerCenters.id });

  await upsertAdminPartnerCenterTranslation(inserted.id, parsed.translation);
  await syncPartnerCenterSurgeons(inserted.id, parsed.surgeonIds ?? []);
  return getAdminPartnerCenterDetail(inserted.id);
}

export async function updateAdminPartnerCenter(id: string, input: unknown) {
  const parsed = adminPartnerCenterPatchSchema.parse(input);
  const [current] = await db.select().from(partnerCenters).where(eq(partnerCenters.id, id)).limit(1);
  if (!current) return null;

  let nextSlug = current.slug;
  if (parsed.slug !== undefined) {
    const slug = normalizeSlug(parsed.slug);
    if (!slug) throw new Error('SLUG_INVALID');
    if (slug !== current.slug) {
      const [dup] = await db.select({ id: partnerCenters.id }).from(partnerCenters).where(eq(partnerCenters.slug, slug)).limit(1);
      if (dup) throw new Error('SLUG_EXISTS');
      nextSlug = slug;
    }
  }

  const bgPatch: Partial<{
    backgroundMode: string;
    backgroundValue: string;
    backgroundImage: string;
  }> = {};
  if (parsed.backgroundMode !== undefined || parsed.backgroundValue !== undefined) {
    const bg = normalizeBackgroundWrite(
      parsed.backgroundMode ?? current.backgroundMode,
      parsed.backgroundValue ?? current.backgroundValue,
    );
    bgPatch.backgroundMode = bg.backgroundMode;
    bgPatch.backgroundValue = bg.backgroundValue;
    bgPatch.backgroundImage = bg.backgroundImage;
  }

  const coverPatch: Partial<{
    coverMode: string;
    coverValue: string;
    coverImage: string;
  }> = {};
  if (parsed.coverMode !== undefined || parsed.coverValue !== undefined) {
    const cover = await resolveCoverFieldsForWrite({
      coverMode: parsed.coverMode ?? current.coverMode,
      coverValue: parsed.coverValue ?? current.coverValue,
    });
    coverPatch.coverMode = cover.coverMode;
    coverPatch.coverValue = cover.coverValue;
    coverPatch.coverImage = cover.coverImage;
  }

  await db.update(partnerCenters).set({
    ...(parsed.slug !== undefined ? { slug: nextSlug } : {}),
    ...(parsed.region !== undefined ? { region: parsed.region } : {}),
    ...(parsed.email !== undefined ? { email: parsed.email.trim() } : {}),
    ...(parsed.website !== undefined ? { website: parsed.website.trim() } : {}),
    ...coverPatch,
    ...(parsed.gallery !== undefined ? { gallery: normalizeGallery(parsed.gallery) } : {}),
    ...(parsed.videoUrl !== undefined ? { videoUrl: normalizeVideoUrl(parsed.videoUrl) } : {}),
    ...(parsed.logo !== undefined ? { logo: toOssStorageKey(parsed.logo) } : {}),
    ...bgPatch,
    ...(parsed.showCoverOnBackground !== undefined
      ? { showCoverOnBackground: parsed.showCoverOnBackground }
      : {}),
    ...(parsed.heroCopyStyle !== undefined
      ? { heroCopyStyle: normalizeHeroCopyStyleForWrite(parsed.heroCopyStyle) }
      : {}),
    ...(parsed.sortOrder !== undefined ? { sortOrder: parsed.sortOrder } : {}),
    updatedAt: new Date(),
  }).where(eq(partnerCenters.id, id));

  if (parsed.surgeonIds !== undefined) {
    await syncPartnerCenterSurgeons(id, parsed.surgeonIds);
  }

  return getAdminPartnerCenterDetail(id);
}

export async function upsertAdminPartnerCenterTranslation(centerId: string, input: unknown) {
  const parsed = adminPartnerCenterTranslationSchema.parse(input);
  const [center] = await db.select({ id: partnerCenters.id }).from(partnerCenters).where(eq(partnerCenters.id, centerId)).limit(1);
  if (!center) return null;

  const [existing] = await db.select().from(partnerCenterTranslations)
    .where(and(eq(partnerCenterTranslations.centerId, centerId), eq(partnerCenterTranslations.locale, parsed.locale)))
    .limit(1);

  const values = {
    name: parsed.name,
    description: parsed.description ?? '',
    detailDescription: parsed.detailDescription ?? '',
    location: parsed.location ?? '',
    badgeText: parsed.badgeText ?? '',
    address: parsed.address ?? '',
    businessHours: parsed.businessHours ?? '',
    contact: parsed.contact ?? '',
    tags: parsed.tags ?? [],
    stats: normalizePartnerCenterMetrics(parsed.stats),
    cooperationInfo: normalizePartnerCenterMetrics(parsed.cooperationInfo),
    updatedAt: new Date(),
  };

  if (existing) {
    const [updated] = await db.update(partnerCenterTranslations).set(values).where(eq(partnerCenterTranslations.id, existing.id)).returning();
    return mapTranslation(updated);
  }

  const [inserted] = await db.insert(partnerCenterTranslations).values({ centerId, locale: parsed.locale, ...values }).returning();
  return mapTranslation(inserted);
}

export async function deleteAdminPartnerCenter(id: string) {
  const [deleted] = await db.delete(partnerCenters).where(eq(partnerCenters.id, id)).returning({ id: partnerCenters.id });
  return Boolean(deleted);
}

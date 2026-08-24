import 'server-only';

import { and, asc, desc, eq, inArray } from 'drizzle-orm';

import { resolveAdminRowMediaPreviews } from '@/lib/admin-media-previews';
import {
  normalizeBackgroundWrite,
} from '@/lib/partner-center-background-presets';
import {
  type AdminSummitDetail,
  type AdminSummitListItem,
  type AdminSummitTranslation,
  type SummitStatus,
  adminSummitCreateSchema,
  adminSummitPatchSchema,
  adminSummitTranslationSchema,
  normalizeSpeakerItems,
  normalizeSponsorItems,
  normalizeSummitStats,
  resolveSummitDisplayTitle,
} from '@/lib/summit-content';
import type { AgendaGroup } from '@/server/db/schema';
import { resolveOssAssetUrl, toOssStorageKey } from '@/lib/oss-asset-url';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { normalizeSlug } from '@/lib/slug';
import { db } from '@/server/db';
import { summits, summitTranslations } from '@/server/db/schema';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { resolveCoverFieldsForWrite } from '@/server/admin/cover-images';
import { normalizeHeroCopyStyleForWrite, type HeroCopyStyle } from '@/lib/hero-copy-style';
import {
  normalizeHeroCoverDisplay,
  resolveStorefrontHeroCoverDisplay,
} from '@/lib/hero-cover-display';

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function normalizeVideoUrl(value: string | undefined): string {
  const trimmed = value?.trim() ?? '';
  return trimmed ? toOssStorageKey(trimmed) : '';
}

function mapListItem(
  row: typeof summits.$inferSelect,
  title: string,
  localeCount: number,
): AdminSummitListItem {
  const { background: bg, cover } = resolveAdminRowMediaPreviews(row, resolveOssAssetUrl);
  return {
    id: row.id,
    slug: row.slug,
    status: row.status as SummitStatus,
    startDate: toIso(row.startDate),
    endDate: toIso(row.endDate),
    coverImage: row.coverImage,
    coverMode: cover.mode,
    coverValue: cover.value,
    coverPreviewUrl: cover.previewUrl,
    videoUrl: row.videoUrl ?? '',
    backgroundImage: row.backgroundImage ?? '',
    backgroundMode: bg.mode,
    backgroundValue: bg.value,
    backgroundPreviewUrl: bg.previewUrl,
    showCoverOnBackground: Boolean(row.showCoverOnBackground),
    coverDisplay: resolveStorefrontHeroCoverDisplay(row.coverDisplay, false),
    heroCopyStyle: (row.heroCopyStyle as HeroCopyStyle | null) ?? null,
    venueImage: row.venueImage,
    sortOrder: row.sortOrder,
    title,
    localeCount,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapTranslation(row: typeof summitTranslations.$inferSelect): AdminSummitTranslation {
  return {
    id: row.id,
    summitId: row.summitId,
    locale: row.locale,
    title: row.title,
    description: row.description,
    detailDescription: row.detailDescription ?? '',
    scale: row.scale,
    duration: row.duration,
    location: row.location,
    address: row.address,
    transportation: row.transportation,
    stats: normalizeSummitStats(row.stats as Array<{ label?: string; value?: string }>),
    speakers: normalizeSpeakerItems(row.speakers ?? []),
    sponsors: normalizeSponsorItems(row.sponsors ?? []),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapDetail(
  row: typeof summits.$inferSelect,
  translations: Array<typeof summitTranslations.$inferSelect>,
  defaultLocale: string,
): AdminSummitDetail {
  const display = pickTranslationForDisplay(translations, defaultLocale);
  return {
    ...mapListItem(row, resolveSummitDisplayTitle(display, row.slug), translations.length),
    agenda: (row.agenda ?? []) as AgendaGroup[],
    translations: translations.map(mapTranslation),
  };
}

export async function getAdminSummitList() {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const rows = await db.select().from(summits).orderBy(asc(summits.sortOrder), asc(summits.slug));

  const ids = rows.map((r) => r.id);
  const translations = ids.length
    ? await db.select().from(summitTranslations).where(inArray(summitTranslations.summitId, ids))
    : [];

  const byId = new Map<string, (typeof summitTranslations.$inferSelect)[]>();
  for (const t of translations) {
    const b = byId.get(t.summitId) ?? [];
    b.push(t);
    byId.set(t.summitId, b);
  }

  const items = rows.map((row) => {
    const rowT = byId.get(row.id) ?? [];
    const display = pickTranslationForDisplay(rowT, defaultLocale);
    return mapListItem(row, resolveSummitDisplayTitle(display, row.slug), rowT.length);
  });

  return { items, total: items.length };
}

export async function getAdminSummitDetail(id: string): Promise<AdminSummitDetail | null> {
  const [row] = await db.select().from(summits).where(eq(summits.id, id)).limit(1);
  if (!row) return null;
  const translations = await db
    .select().from(summitTranslations)
    .where(eq(summitTranslations.summitId, id))
    .orderBy(asc(summitTranslations.locale));
  const defaultLocale = await getDefaultSiteLanguageCode();
  return mapDetail(row, translations, defaultLocale);
}

export async function createAdminSummit(input: unknown) {
  const parsed = adminSummitCreateSchema.parse(input);
  const slug = normalizeSlug(parsed.slug);
  if (!slug) throw new Error('SLUG_INVALID');

  const [existing] = await db.select({ id: summits.id }).from(summits).where(eq(summits.slug, slug)).limit(1);
  if (existing) throw new Error('SLUG_EXISTS');

  const [maxSort] = await db.select({ sortOrder: summits.sortOrder }).from(summits).orderBy(desc(summits.sortOrder)).limit(1);

  const cover = await resolveCoverFieldsForWrite({
    coverMode: parsed.coverMode,
    coverValue: parsed.coverValue,
  });
  const bg = normalizeBackgroundWrite(parsed.backgroundMode, parsed.backgroundValue);

  const [inserted] = await db.insert(summits).values({
    slug,
    status: parsed.status ?? 'upcoming',
    startDate: parsed.startDate ? new Date(parsed.startDate) : null,
    endDate: parsed.endDate ? new Date(parsed.endDate) : null,
    coverImage: cover.coverImage,
    coverMode: cover.coverMode,
    coverValue: cover.coverValue,
    videoUrl: normalizeVideoUrl(parsed.videoUrl),
    backgroundMode: bg.backgroundMode,
    backgroundValue: bg.backgroundValue,
    backgroundImage: bg.backgroundImage,
    showCoverOnBackground: parsed.showCoverOnBackground ?? true,
    coverDisplay: normalizeHeroCoverDisplay(parsed.coverDisplay, undefined, false),
    heroCopyStyle: normalizeHeroCopyStyleForWrite(parsed.heroCopyStyle),
    venueImage: parsed.venueImage ?? '',
    agenda: (parsed.agenda ?? []) as AgendaGroup[],
    sortOrder: parsed.sortOrder ?? (maxSort?.sortOrder ?? 0) + 10,
  }).returning({ id: summits.id });

  await upsertAdminSummitTranslation(inserted.id, parsed.translation);
  return getAdminSummitDetail(inserted.id);
}

export async function updateAdminSummit(id: string, input: unknown) {
  const parsed = adminSummitPatchSchema.parse(input);
  const [current] = await db.select().from(summits).where(eq(summits.id, id)).limit(1);
  if (!current) return null;

  let nextSlug = current.slug;
  if (parsed.slug !== undefined) {
    const slug = normalizeSlug(parsed.slug);
    if (!slug) throw new Error('SLUG_INVALID');
    if (slug !== current.slug) {
      const [dup] = await db.select({ id: summits.id }).from(summits).where(eq(summits.slug, slug)).limit(1);
      if (dup) throw new Error('SLUG_EXISTS');
      nextSlug = slug;
    }
  }

  const coverPatch: Partial<{ coverMode: string; coverValue: string; coverImage: string }> = {};
  if (parsed.coverMode !== undefined || parsed.coverValue !== undefined) {
    const cover = await resolveCoverFieldsForWrite({
      coverMode: parsed.coverMode ?? current.coverMode,
      coverValue: parsed.coverValue ?? current.coverValue,
    });
    coverPatch.coverMode = cover.coverMode;
    coverPatch.coverValue = cover.coverValue;
    coverPatch.coverImage = cover.coverImage;
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

  await db.update(summits).set({
    ...(parsed.slug !== undefined ? { slug: nextSlug } : {}),
    ...(parsed.status !== undefined ? { status: parsed.status } : {}),
    ...(parsed.startDate !== undefined ? { startDate: parsed.startDate ? new Date(parsed.startDate) : null } : {}),
    ...(parsed.endDate !== undefined ? { endDate: parsed.endDate ? new Date(parsed.endDate) : null } : {}),
    ...coverPatch,
    ...(parsed.videoUrl !== undefined ? { videoUrl: normalizeVideoUrl(parsed.videoUrl) } : {}),
    ...bgPatch,
    ...(parsed.showCoverOnBackground !== undefined ? { showCoverOnBackground: parsed.showCoverOnBackground } : {}),
    ...(parsed.coverDisplay !== undefined
      ? { coverDisplay: normalizeHeroCoverDisplay(parsed.coverDisplay, undefined, false) }
      : {}),
    ...(parsed.heroCopyStyle !== undefined
      ? { heroCopyStyle: normalizeHeroCopyStyleForWrite(parsed.heroCopyStyle) }
      : {}),
    ...(parsed.venueImage !== undefined ? { venueImage: parsed.venueImage } : {}),
    ...(parsed.agenda !== undefined ? { agenda: parsed.agenda as AgendaGroup[] } : {}),
    ...(parsed.sortOrder !== undefined ? { sortOrder: parsed.sortOrder } : {}),
    updatedAt: new Date(),
  }).where(eq(summits.id, id));

  return getAdminSummitDetail(id);
}

export async function upsertAdminSummitTranslation(summitId: string, input: unknown) {
  const parsed = adminSummitTranslationSchema.parse(input);
  const [summit] = await db.select({ id: summits.id }).from(summits).where(eq(summits.id, summitId)).limit(1);
  if (!summit) return null;

  const [existing] = await db.select().from(summitTranslations)
    .where(and(eq(summitTranslations.summitId, summitId), eq(summitTranslations.locale, parsed.locale)))
    .limit(1);

  const values = {
    title: parsed.title,
    description: parsed.description ?? '',
    detailDescription: parsed.detailDescription ?? '',
    scale: parsed.scale ?? '',
    duration: parsed.duration ?? '',
    location: parsed.location ?? '',
    address: parsed.address ?? '',
    transportation: parsed.transportation ?? '',
    stats: normalizeSummitStats(parsed.stats),
    speakers: normalizeSpeakerItems(parsed.speakers),
    sponsors: normalizeSponsorItems(parsed.sponsors),
    updatedAt: new Date(),
  };

  if (existing) {
    const [updated] = await db.update(summitTranslations).set(values).where(eq(summitTranslations.id, existing.id)).returning();
    return mapTranslation(updated);
  }

  const [inserted] = await db.insert(summitTranslations).values({ summitId, locale: parsed.locale, ...values }).returning();
  return mapTranslation(inserted);
}

export async function deleteAdminSummit(id: string) {
  const [deleted] = await db.delete(summits).where(eq(summits.id, id)).returning({ id: summits.id });
  return Boolean(deleted);
}

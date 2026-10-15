import 'server-only';

import { and, asc, desc, eq, inArray } from 'drizzle-orm';

import { resolveAdminRowMediaPreviews } from '@/lib/admin-media-previews';
import {
  normalizeBackgroundWrite,
} from '@/lib/partner-center-background-presets';
import {
  type AdminMarketEventDetail,
  type AdminMarketEventListItem,
  type AdminMarketEventTranslation,
  type MarketEventStatus,
  adminMarketEventCreateSchema,
  adminMarketEventPatchSchema,
  adminMarketEventTranslationSchema,
  normalizeSpeakerItems,
  normalizeSponsorItems,
  normalizeMarketEventStats,
  resolveMarketEventDisplayTitle,
} from '@/lib/market-event-content';
import type { AgendaGroup } from '@/server/db/schema';
import { resolveOssAssetUrl, toOssStorageKey } from '@/lib/oss-asset-url';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { normalizeSlug } from '@/lib/slug';
import { db } from '@/server/db';
import { marketEvents, marketEventTranslations } from '@/server/db/schema';
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
  row: typeof marketEvents.$inferSelect,
  title: string,
  localeCount: number,
): AdminMarketEventListItem {
  const { background: bg, cover } = resolveAdminRowMediaPreviews(row, resolveOssAssetUrl);
  return {
    id: row.id,
    slug: row.slug,
    status: row.status as MarketEventStatus,
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

function mapTranslation(row: typeof marketEventTranslations.$inferSelect): AdminMarketEventTranslation {
  return {
    id: row.id,
    marketEventId: row.marketEventId,
    locale: row.locale,
    title: row.title,
    description: row.description,
    detailDescription: row.detailDescription ?? '',
    scale: row.scale,
    duration: row.duration,
    location: row.location,
    address: row.address,
    transportation: row.transportation,
    stats: normalizeMarketEventStats(row.stats as Array<{ label?: string; value?: string }>),
    speakers: normalizeSpeakerItems(row.speakers ?? []),
    sponsors: normalizeSponsorItems(row.sponsors ?? []),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapDetail(
  row: typeof marketEvents.$inferSelect,
  translations: Array<typeof marketEventTranslations.$inferSelect>,
  defaultLocale: string,
): AdminMarketEventDetail {
  const display = pickTranslationForDisplay(translations, defaultLocale);
  return {
    ...mapListItem(row, resolveMarketEventDisplayTitle(display, row.slug), translations.length),
    agenda: (row.agenda ?? []) as AgendaGroup[],
    translations: translations.map(mapTranslation),
  };
}

export async function getAdminMarketEventList() {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const rows = await db.select().from(marketEvents).orderBy(asc(marketEvents.sortOrder), asc(marketEvents.slug));

  const ids = rows.map((r) => r.id);
  const translations = ids.length
    ? await db.select().from(marketEventTranslations).where(inArray(marketEventTranslations.marketEventId, ids))
    : [];

  const byId = new Map<string, (typeof marketEventTranslations.$inferSelect)[]>();
  for (const t of translations) {
    const b = byId.get(t.marketEventId) ?? [];
    b.push(t);
    byId.set(t.marketEventId, b);
  }

  const items = rows.map((row) => {
    const rowT = byId.get(row.id) ?? [];
    const display = pickTranslationForDisplay(rowT, defaultLocale);
    return mapListItem(row, resolveMarketEventDisplayTitle(display, row.slug), rowT.length);
  });

  return { items, total: items.length };
}

export async function getAdminMarketEventDetail(id: string): Promise<AdminMarketEventDetail | null> {
  const [row] = await db.select().from(marketEvents).where(eq(marketEvents.id, id)).limit(1);
  if (!row) return null;
  const translations = await db
    .select().from(marketEventTranslations)
    .where(eq(marketEventTranslations.marketEventId, id))
    .orderBy(asc(marketEventTranslations.locale));
  const defaultLocale = await getDefaultSiteLanguageCode();
  return mapDetail(row, translations, defaultLocale);
}

export async function createAdminMarketEvent(input: unknown) {
  const parsed = adminMarketEventCreateSchema.parse(input);
  const slug = normalizeSlug(parsed.slug);
  if (!slug) throw new Error('SLUG_INVALID');

  const [existing] = await db.select({ id: marketEvents.id }).from(marketEvents).where(eq(marketEvents.slug, slug)).limit(1);
  if (existing) throw new Error('SLUG_EXISTS');

  const [maxSort] = await db.select({ sortOrder: marketEvents.sortOrder }).from(marketEvents).orderBy(desc(marketEvents.sortOrder)).limit(1);

  const cover = await resolveCoverFieldsForWrite({
    coverMode: parsed.coverMode,
    coverValue: parsed.coverValue,
  });
  const bg = normalizeBackgroundWrite(parsed.backgroundMode, parsed.backgroundValue);

  const [inserted] = await db.insert(marketEvents).values({
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
  }).returning({ id: marketEvents.id });

  await upsertAdminMarketEventTranslation(inserted.id, parsed.translation);
  return getAdminMarketEventDetail(inserted.id);
}

export async function updateAdminMarketEvent(id: string, input: unknown) {
  const parsed = adminMarketEventPatchSchema.parse(input);
  const [current] = await db.select().from(marketEvents).where(eq(marketEvents.id, id)).limit(1);
  if (!current) return null;

  let nextSlug = current.slug;
  if (parsed.slug !== undefined) {
    const slug = normalizeSlug(parsed.slug);
    if (!slug) throw new Error('SLUG_INVALID');
    if (slug !== current.slug) {
      const [dup] = await db.select({ id: marketEvents.id }).from(marketEvents).where(eq(marketEvents.slug, slug)).limit(1);
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

  await db.update(marketEvents).set({
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
  }).where(eq(marketEvents.id, id));

  return getAdminMarketEventDetail(id);
}

export async function upsertAdminMarketEventTranslation(marketEventId: string, input: unknown) {
  const parsed = adminMarketEventTranslationSchema.parse(input);
  const [marketEvent] = await db.select({ id: marketEvents.id }).from(marketEvents).where(eq(marketEvents.id, marketEventId)).limit(1);
  if (!marketEvent) return null;

  const [existing] = await db.select().from(marketEventTranslations)
    .where(and(eq(marketEventTranslations.marketEventId, marketEventId), eq(marketEventTranslations.locale, parsed.locale)))
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
    stats: normalizeMarketEventStats(parsed.stats),
    speakers: normalizeSpeakerItems(parsed.speakers),
    sponsors: normalizeSponsorItems(parsed.sponsors),
    updatedAt: new Date(),
  };

  if (existing) {
    const [updated] = await db.update(marketEventTranslations).set(values).where(eq(marketEventTranslations.id, existing.id)).returning();
    return mapTranslation(updated);
  }

  const [inserted] = await db.insert(marketEventTranslations).values({ marketEventId, locale: parsed.locale, ...values }).returning();
  return mapTranslation(inserted);
}

export async function deleteAdminMarketEvent(id: string) {
  const [deleted] = await db.delete(marketEvents).where(eq(marketEvents.id, id)).returning({ id: marketEvents.id });
  return Boolean(deleted);
}

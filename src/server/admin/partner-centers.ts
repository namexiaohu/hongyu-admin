import 'server-only';

import { and, asc, desc, eq, inArray } from 'drizzle-orm';

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
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { normalizeSlug } from '@/lib/slug';
import { db } from '@/server/db';
import { partnerCenters, partnerCenterSurgeons, partnerCenterTranslations } from '@/server/db/schema';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';

function toIso(value: Date) {
  return value.toISOString();
}

function mapListItem(
  row: typeof partnerCenters.$inferSelect,
  name: string,
  localeCount: number,
): AdminPartnerCenterListItem {
  return {
    id: row.id,
    slug: row.slug,
    region: row.region as CenterRegion,
    email: row.email ?? '',
    website: row.website ?? '',
    coverImage: row.coverImage,
    logo: row.logo,
    backgroundImage: row.backgroundImage ?? '',
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

  const [inserted] = await db.insert(partnerCenters).values({
    slug,
    region: parsed.region ?? 'asia-pacific',
    email: parsed.email?.trim() ?? '',
    website: parsed.website?.trim() ?? '',
    coverImage: parsed.coverImage ?? '',
    logo: parsed.logo ?? '',
    backgroundImage: parsed.backgroundImage ?? '',
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

  await db.update(partnerCenters).set({
    ...(parsed.slug !== undefined ? { slug: nextSlug } : {}),
    ...(parsed.region !== undefined ? { region: parsed.region } : {}),
    ...(parsed.email !== undefined ? { email: parsed.email.trim() } : {}),
    ...(parsed.website !== undefined ? { website: parsed.website.trim() } : {}),
    ...(parsed.coverImage !== undefined ? { coverImage: parsed.coverImage } : {}),
    ...(parsed.logo !== undefined ? { logo: parsed.logo } : {}),
    ...(parsed.backgroundImage !== undefined ? { backgroundImage: parsed.backgroundImage } : {}),
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

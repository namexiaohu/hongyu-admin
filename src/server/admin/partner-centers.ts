import 'server-only';

import { and, asc, desc, eq, inArray } from 'drizzle-orm';

import {
  type AdminPartnerCenterDetail,
  type AdminPartnerCenterListItem,
  type AdminPartnerCenterTranslation,
  type CenterRegion,
  adminPartnerCenterCreateSchema,
  adminPartnerCenterPatchSchema,
  adminPartnerCenterTranslationSchema,
  resolveCenterDisplayName,
} from '@/lib/partner-center-content';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { normalizeSlug } from '@/lib/slug';
import { db } from '@/server/db';
import { partnerCenters, partnerCenterTranslations } from '@/server/db/schema';
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
    coverImage: row.coverImage,
    logo: row.logo,
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
    location: row.location,
    badgeText: row.badgeText,
    address: row.address,
    businessHours: row.businessHours,
    contact: row.contact,
    website: row.website,
    tags: (row.tags ?? []) as string[],
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function mapDetail(
  row: typeof partnerCenters.$inferSelect,
  translations: Array<typeof partnerCenterTranslations.$inferSelect>,
  defaultLocale: string,
): AdminPartnerCenterDetail {
  const display = pickTranslationForDisplay(translations, defaultLocale);
  return {
    ...mapListItem(row, resolveCenterDisplayName(display, row.slug), translations.length),
    translations: translations.map(mapTranslation),
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
    coverImage: parsed.coverImage ?? '',
    logo: parsed.logo ?? '',
    sortOrder: parsed.sortOrder ?? (maxSort?.sortOrder ?? 0) + 10,
  }).returning({ id: partnerCenters.id });

  await upsertAdminPartnerCenterTranslation(inserted.id, parsed.translation);
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
    ...(parsed.coverImage !== undefined ? { coverImage: parsed.coverImage } : {}),
    ...(parsed.logo !== undefined ? { logo: parsed.logo } : {}),
    ...(parsed.sortOrder !== undefined ? { sortOrder: parsed.sortOrder } : {}),
    updatedAt: new Date(),
  }).where(eq(partnerCenters.id, id));

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
    location: parsed.location ?? '',
    badgeText: parsed.badgeText ?? '',
    address: parsed.address ?? '',
    businessHours: parsed.businessHours ?? '',
    contact: parsed.contact ?? '',
    website: parsed.website ?? '',
    tags: parsed.tags ?? [],
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

import 'server-only';

import { and, asc, desc, eq, inArray } from 'drizzle-orm';

import {
  type AdminSurgeonDetail,
  type AdminSurgeonListItem,
  type AdminSurgeonTranslation,
  type SurgeonGradeKey,
  adminSurgeonCreateSchema,
  adminSurgeonPatchSchema,
  adminSurgeonTranslationPatchSchema,
  adminSurgeonTranslationSchema,
  resolveSurgeonDisplayName,
} from '@/lib/surgeon-content';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { normalizeSlug } from '@/lib/slug';
import { db } from '@/server/db';
import { surgeons, surgeonTranslations } from '@/server/db/schema';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';

function toIso(value: Date) {
  return value.toISOString();
}

function mapListItem(
  row: typeof surgeons.$inferSelect,
  name: string,
  localeCount: number,
): AdminSurgeonListItem {
  return {
    id: row.id,
    slug: row.slug,
    avatar: row.avatar,
    gradeKey: row.gradeKey as SurgeonGradeKey,
    sortOrder: row.sortOrder,
    name,
    localeCount,
    updatedAt: toIso(row.updatedAt),
  };
}

function mapTranslation(row: typeof surgeonTranslations.$inferSelect): AdminSurgeonTranslation {
  return {
    id: row.id,
    surgeonId: row.surgeonId,
    locale: row.locale,
    name: row.name,
    position: row.position,
    institution: row.institution,
    expertise: row.expertise,
    experience: row.experience,
    gradeTitle: row.gradeTitle,
    tags: (row.tags ?? []) as string[],
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function mapDetail(
  row: typeof surgeons.$inferSelect,
  translations: Array<typeof surgeonTranslations.$inferSelect>,
  defaultLocale: string,
): AdminSurgeonDetail {
  const display = pickTranslationForDisplay(translations, defaultLocale);
  return {
    ...mapListItem(row, resolveSurgeonDisplayName(display, row.slug), translations.length),
    translations: translations.map(mapTranslation),
  };
}

export async function getAdminSurgeonList() {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const rows = await db.select().from(surgeons).orderBy(asc(surgeons.sortOrder), asc(surgeons.slug));

  const ids = rows.map((r) => r.id);
  const translations = ids.length
    ? await db.select().from(surgeonTranslations).where(inArray(surgeonTranslations.surgeonId, ids))
    : [];

  const byId = new Map<string, (typeof surgeonTranslations.$inferSelect)[]>();
  for (const t of translations) {
    const bucket = byId.get(t.surgeonId) ?? [];
    bucket.push(t);
    byId.set(t.surgeonId, bucket);
  }

  const items = rows.map((row) => {
    const rowT = byId.get(row.id) ?? [];
    const display = pickTranslationForDisplay(rowT, defaultLocale);
    return mapListItem(row, resolveSurgeonDisplayName(display, row.slug), rowT.length);
  });

  return { items, total: items.length };
}

export async function getAdminSurgeonDetail(id: string): Promise<AdminSurgeonDetail | null> {
  const [row] = await db.select().from(surgeons).where(eq(surgeons.id, id)).limit(1);
  if (!row) return null;
  const translations = await db
    .select().from(surgeonTranslations)
    .where(eq(surgeonTranslations.surgeonId, id))
    .orderBy(asc(surgeonTranslations.locale));
  const defaultLocale = await getDefaultSiteLanguageCode();
  return mapDetail(row, translations, defaultLocale);
}

export async function createAdminSurgeon(input: unknown) {
  const parsed = adminSurgeonCreateSchema.parse(input);
  const slug = normalizeSlug(parsed.slug);
  if (!slug) throw new Error('SLUG_INVALID');

  const [existing] = await db.select({ id: surgeons.id }).from(surgeons).where(eq(surgeons.slug, slug)).limit(1);
  if (existing) throw new Error('SLUG_EXISTS');

  const [maxSort] = await db.select({ sortOrder: surgeons.sortOrder }).from(surgeons).orderBy(desc(surgeons.sortOrder)).limit(1);

  const [inserted] = await db.insert(surgeons).values({
    slug,
    avatar: parsed.avatar ?? '',
    gradeKey: parsed.gradeKey ?? 'silver',
    sortOrder: parsed.sortOrder ?? (maxSort?.sortOrder ?? 0) + 10,
  }).returning({ id: surgeons.id });

  await upsertAdminSurgeonTranslation(inserted.id, parsed.translation);
  return getAdminSurgeonDetail(inserted.id);
}

export async function updateAdminSurgeon(id: string, input: unknown) {
  const parsed = adminSurgeonPatchSchema.parse(input);
  const [current] = await db.select().from(surgeons).where(eq(surgeons.id, id)).limit(1);
  if (!current) return null;

  let nextSlug = current.slug;
  if (parsed.slug !== undefined) {
    const slug = normalizeSlug(parsed.slug);
    if (!slug) throw new Error('SLUG_INVALID');
    if (slug !== current.slug) {
      const [dup] = await db.select({ id: surgeons.id }).from(surgeons).where(eq(surgeons.slug, slug)).limit(1);
      if (dup) throw new Error('SLUG_EXISTS');
      nextSlug = slug;
    }
  }

  await db.update(surgeons).set({
    ...(parsed.slug !== undefined ? { slug: nextSlug } : {}),
    ...(parsed.avatar !== undefined ? { avatar: parsed.avatar } : {}),
    ...(parsed.gradeKey !== undefined ? { gradeKey: parsed.gradeKey } : {}),
    ...(parsed.sortOrder !== undefined ? { sortOrder: parsed.sortOrder } : {}),
    updatedAt: new Date(),
  }).where(eq(surgeons.id, id));

  return getAdminSurgeonDetail(id);
}

export async function upsertAdminSurgeonTranslation(surgeonId: string, input: unknown) {
  const parsed = adminSurgeonTranslationSchema.parse(input);
  const [surgeon] = await db.select({ id: surgeons.id }).from(surgeons).where(eq(surgeons.id, surgeonId)).limit(1);
  if (!surgeon) return null;

  const [existing] = await db.select().from(surgeonTranslations)
    .where(and(eq(surgeonTranslations.surgeonId, surgeonId), eq(surgeonTranslations.locale, parsed.locale)))
    .limit(1);

  if (existing) {
    const [updated] = await db.update(surgeonTranslations).set({
      name: parsed.name,
      position: parsed.position ?? '',
      institution: parsed.institution ?? '',
      expertise: parsed.expertise ?? '',
      experience: parsed.experience ?? '',
      gradeTitle: parsed.gradeTitle ?? '',
      tags: parsed.tags ?? [],
      updatedAt: new Date(),
    }).where(eq(surgeonTranslations.id, existing.id)).returning();
    return mapTranslation(updated);
  }

  const [inserted] = await db.insert(surgeonTranslations).values({
    surgeonId,
    locale: parsed.locale,
    name: parsed.name,
    position: parsed.position ?? '',
    institution: parsed.institution ?? '',
    expertise: parsed.expertise ?? '',
    experience: parsed.experience ?? '',
    gradeTitle: parsed.gradeTitle ?? '',
    tags: parsed.tags ?? [],
  }).returning();

  return mapTranslation(inserted);
}

export async function deleteAdminSurgeon(id: string) {
  const [deleted] = await db.delete(surgeons).where(eq(surgeons.id, id)).returning({ id: surgeons.id });
  return Boolean(deleted);
}

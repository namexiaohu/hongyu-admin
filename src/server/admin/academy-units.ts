import 'server-only';

import { and, asc, eq, inArray, sql } from 'drizzle-orm';

import type {
  AdminAcademyUnitDetail,
  AdminAcademyUnitListItem,
  AdminAcademyUnitTranslation,
} from '@/lib/academy-unit-content';
import {
  adminAcademyUnitCreateSchema,
  adminAcademyUnitPatchSchema,
} from '@/lib/academy-unit-content';
import { resolveAdminRowMediaPreviews } from '@/lib/admin-media-previews';
import { resolveOssAssetUrl } from '@/lib/oss-asset-url';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { resolveCoverFieldsForWrite } from '@/server/admin/cover-images';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { db } from '@/server/db';
import {
  academyLessons,
  academyUnitTranslations,
  academyUnits,
} from '@/server/db/schema';
import type { z } from 'zod';

function toIso(value: Date) {
  return value.toISOString();
}

function mapTranslation(row: typeof academyUnitTranslations.$inferSelect): AdminAcademyUnitTranslation {
  return {
    id: row.id,
    unitId: row.unitId,
    locale: row.locale,
    title: row.title,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function mapListItem(
  row: typeof academyUnits.$inferSelect,
  title: string,
  localeCount: number,
  lessonCount: number,
): AdminAcademyUnitListItem {
  const { cover } = resolveAdminRowMediaPreviews(row, resolveOssAssetUrl);
  return {
    id: row.id,
    courseId: row.courseId,
    sortOrder: row.sortOrder,
    coverImage: row.coverImage,
    coverMode: cover.mode,
    coverValue: cover.value,
    coverPreviewUrl: cover.previewUrl,
    title,
    lessonCount,
    localeCount,
    updatedAt: toIso(row.updatedAt),
  };
}

export async function listAdminAcademyUnits(courseId: string): Promise<AdminAcademyUnitListItem[]> {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const rows = await db
    .select()
    .from(academyUnits)
    .where(eq(academyUnits.courseId, courseId))
    .orderBy(asc(academyUnits.sortOrder), asc(academyUnits.createdAt));

  if (!rows.length) return [];

  const unitIds = rows.map((row) => row.id);
  const translations = await db
    .select()
    .from(academyUnitTranslations)
    .where(inArray(academyUnitTranslations.unitId, unitIds));
  const lessonCounts = await db
    .select({
      unitId: academyLessons.unitId,
      count: sql<number>`count(*)::int`,
    })
    .from(academyLessons)
    .where(inArray(academyLessons.unitId, unitIds))
    .groupBy(academyLessons.unitId);

  const tByUnit = new Map<string, typeof translations>();
  for (const t of translations) {
    const bucket = tByUnit.get(t.unitId) ?? [];
    bucket.push(t);
    tByUnit.set(t.unitId, bucket);
  }
  const countByUnit = new Map(lessonCounts.map((item) => [item.unitId, item.count]));

  return rows.map((row) => {
    const list = tByUnit.get(row.id) ?? [];
    const display = pickTranslationForDisplay(list, defaultLocale);
    return mapListItem(row, display?.title?.trim() || 'Untitled unit', list.length, countByUnit.get(row.id) ?? 0);
  });
}

export async function getAdminAcademyUnitDetail(id: string): Promise<AdminAcademyUnitDetail | null> {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const [row] = await db.select().from(academyUnits).where(eq(academyUnits.id, id)).limit(1);
  if (!row) return null;

  const translations = await db
    .select()
    .from(academyUnitTranslations)
    .where(eq(academyUnitTranslations.unitId, id));
  const [{ count } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(academyLessons)
    .where(eq(academyLessons.unitId, id));

  const display = pickTranslationForDisplay(translations, defaultLocale);
  return {
    ...mapListItem(row, display?.title?.trim() || 'Untitled unit', translations.length, count),
    translations: translations.map(mapTranslation),
  };
}

export async function createAdminAcademyUnit(
  courseId: string,
  input: z.infer<typeof adminAcademyUnitCreateSchema>,
): Promise<AdminAcademyUnitDetail> {
  const parsed = adminAcademyUnitCreateSchema.parse(input);
  const [maxSort] = await db
    .select({ sortOrder: academyUnits.sortOrder })
    .from(academyUnits)
    .where(eq(academyUnits.courseId, courseId))
    .orderBy(sql`${academyUnits.sortOrder} desc`)
    .limit(1);

  const cover = await resolveCoverFieldsForWrite({
    coverMode: parsed.coverMode,
    coverValue: parsed.coverValue,
  });

  const [inserted] = await db
    .insert(academyUnits)
    .values({
      courseId,
      sortOrder: (maxSort?.sortOrder ?? 0) + 10,
      coverImage: cover.coverImage,
      coverMode: cover.coverMode,
      coverValue: cover.coverValue,
    })
    .returning();

  await db.insert(academyUnitTranslations).values({
    unitId: inserted.id,
    locale: parsed.translation.locale,
    title: parsed.translation.title?.trim() ?? '',
  });

  const detail = await getAdminAcademyUnitDetail(inserted.id);
  if (!detail) throw new Error('CREATE_FAILED');
  return detail;
}

export async function updateAdminAcademyUnit(
  id: string,
  input: z.infer<typeof adminAcademyUnitPatchSchema>,
): Promise<AdminAcademyUnitDetail | null> {
  const parsed = adminAcademyUnitPatchSchema.parse(input);
  const [existing] = await db.select().from(academyUnits).where(eq(academyUnits.id, id)).limit(1);
  if (!existing) return null;

  const cover =
    parsed.coverMode !== undefined || parsed.coverValue !== undefined
      ? await resolveCoverFieldsForWrite({
          coverMode: parsed.coverMode ?? existing.coverMode,
          coverValue: parsed.coverValue ?? existing.coverValue,
        })
      : null;

  await db
    .update(academyUnits)
    .set({
      ...(cover
        ? {
            coverImage: cover.coverImage,
            coverMode: cover.coverMode,
            coverValue: cover.coverValue,
          }
        : {}),
      ...(parsed.sortOrder !== undefined ? { sortOrder: parsed.sortOrder } : {}),
      updatedAt: new Date(),
    })
    .where(eq(academyUnits.id, id));

  return getAdminAcademyUnitDetail(id);
}

export async function upsertAdminAcademyUnitTranslation(
  unitId: string,
  input: { locale: string; title?: string },
): Promise<AdminAcademyUnitDetail | null> {
  const [existing] = await db.select().from(academyUnits).where(eq(academyUnits.id, unitId)).limit(1);
  if (!existing) return null;

  const locale = input.locale.trim();
  const [current] = await db
    .select()
    .from(academyUnitTranslations)
    .where(and(eq(academyUnitTranslations.unitId, unitId), eq(academyUnitTranslations.locale, locale)))
    .limit(1);

  if (current) {
    await db
      .update(academyUnitTranslations)
      .set({
        title: input.title?.trim() ?? current.title,
        updatedAt: new Date(),
      })
      .where(eq(academyUnitTranslations.id, current.id));
  } else {
    await db.insert(academyUnitTranslations).values({
      unitId,
      locale,
      title: input.title?.trim() ?? '',
    });
  }

  return getAdminAcademyUnitDetail(unitId);
}

export async function reorderAdminAcademyUnits(courseId: string, ids: string[]): Promise<AdminAcademyUnitListItem[]> {
  const rows = await db.select().from(academyUnits).where(eq(academyUnits.courseId, courseId));
  const owned = new Set(rows.map((row) => row.id));
  if (ids.some((id) => !owned.has(id)) || ids.length !== owned.size) {
    throw new Error('REORDER_INVALID');
  }

  await Promise.all(
    ids.map((id, index) =>
      db
        .update(academyUnits)
        .set({ sortOrder: (index + 1) * 10, updatedAt: new Date() })
        .where(eq(academyUnits.id, id)),
    ),
  );

  return listAdminAcademyUnits(courseId);
}

export async function deleteAdminAcademyUnit(id: string): Promise<boolean> {
  const deleted = await db.delete(academyUnits).where(eq(academyUnits.id, id)).returning({ id: academyUnits.id });
  return deleted.length > 0;
}

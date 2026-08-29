import 'server-only';

import { and, asc, eq, inArray, sql } from 'drizzle-orm';

import type {
  AcademyLessonMaterial,
  AdminAcademyLessonDetail,
  AdminAcademyLessonListItem,
  AdminAcademyLessonTranslation,
} from '@/lib/academy-lesson-content';
import {
  adminAcademyLessonCreateSchema,
  adminAcademyLessonPatchSchema,
} from '@/lib/academy-lesson-content';
import { toOssStorageKey, resolveOssAssetUrl } from '@/lib/oss-asset-url';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { db } from '@/server/db';
import { academyLessonTranslations, academyLessons } from '@/server/db/schema';
import type { z } from 'zod';

function toIso(value: Date) {
  return value.toISOString();
}

function normalizeVideoUrl(value: string | undefined): string {
  const trimmed = value?.trim() ?? '';
  return trimmed ? toOssStorageKey(trimmed) : '';
}

function normalizeMaterials(materials: AcademyLessonMaterial[] | undefined): AcademyLessonMaterial[] {
  if (!materials?.length) return [];
  return materials
    .map((item) => ({
      name: item.name?.trim() || 'Attachment',
      url: toOssStorageKey(item.url.trim()),
      mimeType: item.mimeType?.trim() || 'application/octet-stream',
      size: item.size ?? null,
    }))
    .filter((item) => item.url);
}

function mapMaterialsForAdmin(materials: AcademyLessonMaterial[] | null | undefined): AcademyLessonMaterial[] {
  return (materials ?? [])
    .map((item) => ({
      ...item,
      url: item.url?.trim() ? resolveOssAssetUrl(item.url) : '',
    }))
    .filter((item) => item.url);
}

function mapTranslation(row: typeof academyLessonTranslations.$inferSelect): AdminAcademyLessonTranslation {
  return {
    id: row.id,
    lessonId: row.lessonId,
    locale: row.locale,
    title: row.title,
    description: row.description,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function mapListItem(
  row: typeof academyLessons.$inferSelect,
  title: string,
  localeCount: number,
): AdminAcademyLessonListItem {
  return {
    id: row.id,
    unitId: row.unitId,
    sortOrder: row.sortOrder,
    videoUrl: row.videoUrl?.trim() ? resolveOssAssetUrl(row.videoUrl) : '',
    durationSeconds: row.durationSeconds,
    materials: mapMaterialsForAdmin(row.materials as AcademyLessonMaterial[]),
    title,
    localeCount,
    updatedAt: toIso(row.updatedAt),
  };
}

export async function listAdminAcademyLessons(unitId: string): Promise<AdminAcademyLessonListItem[]> {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const rows = await db
    .select()
    .from(academyLessons)
    .where(eq(academyLessons.unitId, unitId))
    .orderBy(asc(academyLessons.sortOrder), asc(academyLessons.createdAt));

  if (!rows.length) return [];

  const lessonIds = rows.map((row) => row.id);
  const translations = await db
    .select()
    .from(academyLessonTranslations)
    .where(inArray(academyLessonTranslations.lessonId, lessonIds));

  const tByLesson = new Map<string, typeof translations>();
  for (const t of translations) {
    const bucket = tByLesson.get(t.lessonId) ?? [];
    bucket.push(t);
    tByLesson.set(t.lessonId, bucket);
  }

  return rows.map((row) => {
    const list = tByLesson.get(row.id) ?? [];
    const display = pickTranslationForDisplay(list, defaultLocale);
    return mapListItem(row, display?.title?.trim() || 'Untitled lesson', list.length);
  });
}

export async function getAdminAcademyLessonDetail(id: string): Promise<AdminAcademyLessonDetail | null> {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const [row] = await db.select().from(academyLessons).where(eq(academyLessons.id, id)).limit(1);
  if (!row) return null;

  const translations = await db
    .select()
    .from(academyLessonTranslations)
    .where(eq(academyLessonTranslations.lessonId, id));
  const display = pickTranslationForDisplay(translations, defaultLocale);

  return {
    ...mapListItem(row, display?.title?.trim() || 'Untitled lesson', translations.length),
    translations: translations.map(mapTranslation),
  };
}

export async function createAdminAcademyLesson(
  unitId: string,
  input: z.infer<typeof adminAcademyLessonCreateSchema>,
): Promise<AdminAcademyLessonDetail> {
  const parsed = adminAcademyLessonCreateSchema.parse(input);
  const [maxSort] = await db
    .select({ sortOrder: academyLessons.sortOrder })
    .from(academyLessons)
    .where(eq(academyLessons.unitId, unitId))
    .orderBy(sql`${academyLessons.sortOrder} desc`)
    .limit(1);

  const [inserted] = await db
    .insert(academyLessons)
    .values({
      unitId,
      sortOrder: (maxSort?.sortOrder ?? 0) + 10,
      videoUrl: normalizeVideoUrl(parsed.videoUrl),
      durationSeconds: parsed.durationSeconds ?? 0,
      materials: normalizeMaterials(parsed.materials),
    })
    .returning();

  await db.insert(academyLessonTranslations).values({
    lessonId: inserted.id,
    locale: parsed.translation.locale,
    title: parsed.translation.title?.trim() ?? '',
    description: parsed.translation.description?.trim() ?? '',
  });

  const detail = await getAdminAcademyLessonDetail(inserted.id);
  if (!detail) throw new Error('CREATE_FAILED');
  return detail;
}

export async function updateAdminAcademyLesson(
  id: string,
  input: z.infer<typeof adminAcademyLessonPatchSchema>,
): Promise<AdminAcademyLessonDetail | null> {
  const parsed = adminAcademyLessonPatchSchema.parse(input);
  const [existing] = await db.select().from(academyLessons).where(eq(academyLessons.id, id)).limit(1);
  if (!existing) return null;

  await db
    .update(academyLessons)
    .set({
      ...(parsed.videoUrl !== undefined ? { videoUrl: normalizeVideoUrl(parsed.videoUrl) } : {}),
      ...(parsed.durationSeconds !== undefined ? { durationSeconds: parsed.durationSeconds } : {}),
      ...(parsed.materials !== undefined ? { materials: normalizeMaterials(parsed.materials) } : {}),
      ...(parsed.sortOrder !== undefined ? { sortOrder: parsed.sortOrder } : {}),
      updatedAt: new Date(),
    })
    .where(eq(academyLessons.id, id));

  return getAdminAcademyLessonDetail(id);
}

export async function upsertAdminAcademyLessonTranslation(
  lessonId: string,
  input: { locale: string; title?: string; description?: string },
): Promise<AdminAcademyLessonDetail | null> {
  const [existing] = await db.select().from(academyLessons).where(eq(academyLessons.id, lessonId)).limit(1);
  if (!existing) return null;

  const locale = input.locale.trim();
  const [current] = await db
    .select()
    .from(academyLessonTranslations)
    .where(and(eq(academyLessonTranslations.lessonId, lessonId), eq(academyLessonTranslations.locale, locale)))
    .limit(1);

  if (current) {
    await db
      .update(academyLessonTranslations)
      .set({
        title: input.title?.trim() ?? current.title,
        description: input.description?.trim() ?? current.description,
        updatedAt: new Date(),
      })
      .where(eq(academyLessonTranslations.id, current.id));
  } else {
    await db.insert(academyLessonTranslations).values({
      lessonId,
      locale,
      title: input.title?.trim() ?? '',
      description: input.description?.trim() ?? '',
    });
  }

  return getAdminAcademyLessonDetail(lessonId);
}

export async function reorderAdminAcademyLessons(unitId: string, ids: string[]): Promise<AdminAcademyLessonListItem[]> {
  const rows = await db.select().from(academyLessons).where(eq(academyLessons.unitId, unitId));
  const owned = new Set(rows.map((row) => row.id));
  if (ids.some((id) => !owned.has(id)) || ids.length !== owned.size) {
    throw new Error('REORDER_INVALID');
  }

  await Promise.all(
    ids.map((id, index) =>
      db
        .update(academyLessons)
        .set({ sortOrder: (index + 1) * 10, updatedAt: new Date() })
        .where(eq(academyLessons.id, id)),
    ),
  );

  return listAdminAcademyLessons(unitId);
}

export async function deleteAdminAcademyLesson(id: string): Promise<boolean> {
  const deleted = await db.delete(academyLessons).where(eq(academyLessons.id, id)).returning({ id: academyLessons.id });
  return deleted.length > 0;
}

import 'server-only';

import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';

import {
  normalizeAcademyListingStatus,
  normalizeAcademyStats,
  normalizeStringTags,
} from '@/lib/academy-content-shared';
import {
  type AdminAcademyCourseDetail,
  type AdminAcademyCourseListItem,
  type AdminAcademyCourseTranslation,
  adminAcademyCourseCreateSchema,
  adminAcademyCoursePatchSchema,
  adminAcademyCourseTranslationSchema,
  type AcademyCourseSlug,
  reservedAcademyCourseSlugs,
} from '@/lib/academy-course-content';
import { resolveAdminRowMediaPreviews } from '@/lib/admin-media-previews';
import {
  normalizeHeroCoverDisplay,
  resolveStorefrontHeroCoverDisplay,
} from '@/lib/hero-cover-display';
import { toOssStorageKey, resolveOssAssetUrl } from '@/lib/oss-asset-url';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import type { ProductGalleryImage } from '@/lib/product-content';
import { normalizeSlug } from '@/lib/slug';
import { resolveCoverFieldsForWrite } from '@/server/admin/cover-images';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { db } from '@/server/db';
import { academyCourseTranslations, academyCourses, academyUnits } from '@/server/db/schema';

function toIso(value: Date) {
  return value.toISOString();
}

function normalizeGallery(gallery: Array<{ url: string; alt?: string; width?: number | null; height?: number | null }> | undefined): ProductGalleryImage[] {
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

function mapGalleryForAdmin(gallery: ProductGalleryImage[] | null | undefined): ProductGalleryImage[] {
  return (gallery ?? []).map((item) => ({
    ...item,
    url: item.url?.trim() ? resolveOssAssetUrl(item.url) : '',
  })).filter((item) => item.url);
}

function mapTranslation(row: typeof academyCourseTranslations.$inferSelect): AdminAcademyCourseTranslation {
  return {
    id: row.id,
    courseId: row.courseId,
    locale: row.locale,
    title: row.title,
    subtitle: row.subtitle ?? '',
    badgeLabel: row.badgeLabel ?? '',
    summary: row.summary,
    description: row.description,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    stats: normalizeAcademyStats(row.stats ?? []),
    learnings: normalizeStringTags(row.learnings ?? []),
    skills: normalizeStringTags(row.skills ?? []),
    tools: normalizeStringTags(row.tools ?? []),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function mapListItem(
  row: typeof academyCourses.$inferSelect,
  title: string,
  localeCount: number,
  unitCount: number,
): AdminAcademyCourseListItem {
  const { cover } = resolveAdminRowMediaPreviews(row, resolveOssAssetUrl);
  return {
    id: row.id,
    slug: row.slug,
    sortOrder: row.sortOrder,
    status: normalizeAcademyListingStatus(row.status),
    coverImage: row.coverImage,
    coverMode: cover.mode,
    coverValue: cover.value,
    coverPreviewUrl: cover.previewUrl,
    gallery: mapGalleryForAdmin(row.gallery as ProductGalleryImage[]),
    videoUrl: row.videoUrl?.trim() ? resolveOssAssetUrl(row.videoUrl) : '',
    showCoverOnBackground: Boolean(row.showCoverOnBackground),
    coverDisplay: resolveStorefrontHeroCoverDisplay(row.coverDisplay),
    teacherCount: row.teacherCount,
    studentCount: row.studentCount,
    title,
    localeCount,
    unitCount,
    publishedAt: row.publishedAt ? toIso(row.publishedAt) : null,
    updatedAt: toIso(row.updatedAt),
  };
}

function mapDetail(
  row: typeof academyCourses.$inferSelect,
  translations: Array<typeof academyCourseTranslations.$inferSelect>,
  defaultLocale: string,
  unitCount: number,
): AdminAcademyCourseDetail {
  const display = pickTranslationForDisplay(translations, defaultLocale);
  return {
    ...mapListItem(row, display?.title?.trim() ?? '', translations.length, unitCount),
    translations: translations.map(mapTranslation),
  };
}

export async function getAdminAcademyCourseList() {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const rows = await db.select().from(academyCourses).orderBy(asc(academyCourses.sortOrder), asc(academyCourses.slug));
  const ids = rows.map((row) => row.id);
  const translations = ids.length
    ? await db.select().from(academyCourseTranslations).where(inArray(academyCourseTranslations.courseId, ids))
    : [];
  const byId = new Map<string, (typeof academyCourseTranslations.$inferSelect)[]>();
  for (const row of translations) {
    const bucket = byId.get(row.courseId) ?? [];
    bucket.push(row);
    byId.set(row.courseId, bucket);
  }
  const unitCounts = ids.length
    ? await db
      .select({
        courseId: academyUnits.courseId,
        count: sql<number>`count(*)::int`,
      })
      .from(academyUnits)
      .where(inArray(academyUnits.courseId, ids))
      .groupBy(academyUnits.courseId)
    : [];
  const unitCountById = new Map(unitCounts.map((row) => [row.courseId, row.count]));
  const items = rows.map((row) => {
    const rowTranslations = byId.get(row.id) ?? [];
    const display = pickTranslationForDisplay(rowTranslations, defaultLocale);
    return mapListItem(
      row,
      display?.title?.trim() ?? '',
      rowTranslations.length,
      unitCountById.get(row.id) ?? 0,
    );
  });
  return { items, total: items.length };
}

export async function getAdminAcademyCourseDetail(id: string): Promise<AdminAcademyCourseDetail | null> {
  const [row] = await db.select().from(academyCourses).where(eq(academyCourses.id, id)).limit(1);
  if (!row) return null;
  const translations = await db
    .select()
    .from(academyCourseTranslations)
    .where(eq(academyCourseTranslations.courseId, id))
    .orderBy(asc(academyCourseTranslations.locale));
  const defaultLocale = await getDefaultSiteLanguageCode();
  const [unitCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(academyUnits)
    .where(eq(academyUnits.courseId, id));
  return mapDetail(row, translations, defaultLocale, unitCountRow?.count ?? 0);
}

export async function getAdminAcademyCoursePickerItems(ids: string[]) {
  if (!ids.length) return [];
  const defaultLocale = await getDefaultSiteLanguageCode();
  const rows = await db.select().from(academyCourses).where(inArray(academyCourses.id, ids));
  const translations = await db
    .select()
    .from(academyCourseTranslations)
    .where(inArray(academyCourseTranslations.courseId, ids));
  const byId = new Map<string, (typeof academyCourseTranslations.$inferSelect)[]>();
  for (const row of translations) {
    const bucket = byId.get(row.courseId) ?? [];
    bucket.push(row);
    byId.set(row.courseId, bucket);
  }
  return rows.map((row) => {
    const display = pickTranslationForDisplay(byId.get(row.id) ?? [], defaultLocale);
    const { cover } = resolveAdminRowMediaPreviews(row, resolveOssAssetUrl);
    return {
      id: row.id,
      slug: row.slug,
      title: display?.title?.trim() ?? '',
      coverPreviewUrl: cover.previewUrl,
      status: normalizeAcademyListingStatus(row.status),
    };
  });
}

function assertSlugAvailable(slug: AcademyCourseSlug) {
  if (reservedAcademyCourseSlugs.includes(slug as (typeof reservedAcademyCourseSlugs)[number])) {
    throw new Error('SLUG_RESERVED');
  }
}

export async function createAdminAcademyCourse(input: unknown) {
  const parsed = adminAcademyCourseCreateSchema.parse(input);
  const slug = normalizeSlug(parsed.slug ?? parsed.translation.title);
  if (!slug) throw new Error('SLUG_INVALID');
  assertSlugAvailable(slug);
  const [existing] = await db.select({ id: academyCourses.id }).from(academyCourses).where(eq(academyCourses.slug, slug)).limit(1);
  if (existing) throw new Error('SLUG_EXISTS');

  const [maxSort] = await db.select({ sortOrder: academyCourses.sortOrder }).from(academyCourses).orderBy(desc(academyCourses.sortOrder)).limit(1);
  const cover = await resolveCoverFieldsForWrite({
    coverMode: parsed.coverMode,
    coverValue: parsed.coverValue,
  });

  const status = parsed.status ?? 'published';
  const [inserted] = await db.insert(academyCourses).values({
    slug,
    status,
    sortOrder: parsed.sortOrder ?? (maxSort?.sortOrder ?? 0) + 10,
    coverImage: cover.coverImage,
    coverMode: cover.coverMode,
    coverValue: cover.coverValue,
    gallery: normalizeGallery(parsed.gallery),
    videoUrl: normalizeVideoUrl(parsed.videoUrl),
    showCoverOnBackground: parsed.showCoverOnBackground ?? false,
    coverDisplay: normalizeHeroCoverDisplay(parsed.coverDisplay, undefined, true),
    teacherCount: parsed.teacherCount ?? 0,
    studentCount: parsed.studentCount ?? 0,
    publishedAt: status === 'published' ? new Date() : null,
  }).returning({ id: academyCourses.id });

  await upsertAdminAcademyCourseTranslation(inserted.id, parsed.translation);
  return getAdminAcademyCourseDetail(inserted.id);
}

export async function updateAdminAcademyCourse(id: string, input: unknown) {
  const parsed = adminAcademyCoursePatchSchema.parse(input);
  const [current] = await db.select().from(academyCourses).where(eq(academyCourses.id, id)).limit(1);
  if (!current) return null;

  let nextSlug = current.slug;
  if (parsed.slug !== undefined) {
    const slug = normalizeSlug(parsed.slug);
    if (!slug) throw new Error('SLUG_INVALID');
    assertSlugAvailable(slug);
    if (slug !== current.slug) {
      const [dup] = await db.select({ id: academyCourses.id }).from(academyCourses).where(eq(academyCourses.slug, slug)).limit(1);
      if (dup) throw new Error('SLUG_EXISTS');
      nextSlug = slug;
    }
  }

  const cover = parsed.coverMode !== undefined || parsed.coverValue !== undefined
    ? await resolveCoverFieldsForWrite({
      coverMode: parsed.coverMode ?? current.coverMode,
      coverValue: parsed.coverValue ?? current.coverValue,
    })
    : null;

  const nextStatus = parsed.status !== undefined
    ? parsed.status
    : normalizeAcademyListingStatus(current.status);
  await db.update(academyCourses).set({
    ...(parsed.slug !== undefined ? { slug: nextSlug } : {}),
    ...(parsed.status !== undefined ? { status: nextStatus } : {}),
    ...(parsed.sortOrder !== undefined ? { sortOrder: parsed.sortOrder } : {}),
    ...(parsed.teacherCount !== undefined ? { teacherCount: parsed.teacherCount } : {}),
    ...(parsed.studentCount !== undefined ? { studentCount: parsed.studentCount } : {}),
    ...(cover ? { coverImage: cover.coverImage, coverMode: cover.coverMode, coverValue: cover.coverValue } : {}),
    ...(parsed.gallery !== undefined ? { gallery: normalizeGallery(parsed.gallery) } : {}),
    ...(parsed.videoUrl !== undefined ? { videoUrl: normalizeVideoUrl(parsed.videoUrl) } : {}),
    ...(parsed.showCoverOnBackground !== undefined ? { showCoverOnBackground: parsed.showCoverOnBackground } : {}),
    ...(parsed.coverDisplay !== undefined
      ? { coverDisplay: normalizeHeroCoverDisplay(parsed.coverDisplay, current.coverDisplay, true) }
      : {}),
    ...(nextStatus === 'published' && !current.publishedAt ? { publishedAt: new Date() } : {}),
    updatedAt: new Date(),
  }).where(eq(academyCourses.id, id));

  return getAdminAcademyCourseDetail(id);
}

export async function upsertAdminAcademyCourseTranslation(courseId: string, input: unknown) {
  const parsed = adminAcademyCourseTranslationSchema.parse(input);
  const [course] = await db.select({ id: academyCourses.id }).from(academyCourses).where(eq(academyCourses.id, courseId)).limit(1);
  if (!course) return null;

  const stats = normalizeAcademyStats(parsed.stats);
  const learnings = normalizeStringTags(parsed.learnings);
  const skills = normalizeStringTags(parsed.skills);
  const tools = normalizeStringTags(parsed.tools);

  const [existing] = await db.select().from(academyCourseTranslations)
    .where(and(eq(academyCourseTranslations.courseId, courseId), eq(academyCourseTranslations.locale, parsed.locale)))
    .limit(1);

  if (existing) {
    const [updated] = await db.update(academyCourseTranslations).set({
      title: parsed.title,
      subtitle: parsed.subtitle ?? '',
      badgeLabel: parsed.badgeLabel ?? '',
      summary: parsed.summary ?? '',
      description: parsed.description ?? '',
      seoTitle: parsed.seoTitle ?? '',
      seoDescription: parsed.seoDescription ?? '',
      stats,
      learnings,
      skills,
      tools,
      updatedAt: new Date(),
    }).where(eq(academyCourseTranslations.id, existing.id)).returning();
    return mapTranslation(updated);
  }

  const [inserted] = await db.insert(academyCourseTranslations).values({
    courseId,
    locale: parsed.locale,
    title: parsed.title,
    subtitle: parsed.subtitle ?? '',
    badgeLabel: parsed.badgeLabel ?? '',
    summary: parsed.summary ?? '',
    description: parsed.description ?? '',
    seoTitle: parsed.seoTitle ?? '',
    seoDescription: parsed.seoDescription ?? '',
    stats,
    learnings,
    skills,
    tools,
  }).returning();
  return mapTranslation(inserted);
}

export async function deleteAdminAcademyCourse(id: string) {
  const [deleted] = await db.delete(academyCourses).where(eq(academyCourses.id, id)).returning({ id: academyCourses.id });
  return Boolean(deleted);
}

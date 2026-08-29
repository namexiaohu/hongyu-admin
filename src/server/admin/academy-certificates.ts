import 'server-only';

import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';

import {
  normalizeAcademyListingStatus,
  normalizeAcademyStats,
  normalizeStringTags,
  resolveAcademyDisplayTitle,
} from '@/lib/academy-content-shared';
import {
  type AdminAcademyCertificateDetail,
  type AdminAcademyCertificateListItem,
  type AdminAcademyCertificateTranslation,
  adminAcademyCertificateCreateSchema,
  adminAcademyCertificatePatchSchema,
  adminAcademyCertificateTranslationSchema,
  reservedAcademyCertificateSlugs,
} from '@/lib/academy-certificate-content';
import { resolveAdminRowMediaPreviews } from '@/lib/admin-media-previews';
import {
  normalizeHeroCoverDisplay,
  resolveStorefrontHeroCoverDisplay,
} from '@/lib/hero-cover-display';
import { toOssStorageKey, resolveOssAssetUrl } from '@/lib/oss-asset-url';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { normalizeSlug } from '@/lib/slug';
import type { ProductGalleryImage } from '@/lib/product-content';
import { resolveCoverFieldsForWrite } from '@/server/admin/cover-images';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { db } from '@/server/db';
import {
  academyCertificateCourses,
  academyCertificateTranslations,
  academyCertificates,
} from '@/server/db/schema';

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

function mapTranslation(row: typeof academyCertificateTranslations.$inferSelect): AdminAcademyCertificateTranslation {
  return {
    id: row.id,
    certificateId: row.certificateId,
    locale: row.locale,
    title: row.title,
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
  row: typeof academyCertificates.$inferSelect,
  title: string,
  localeCount: number,
  courseCount: number,
): AdminAcademyCertificateListItem {
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
    courseCount,
    publishedAt: row.publishedAt ? toIso(row.publishedAt) : null,
    updatedAt: toIso(row.updatedAt),
  };
}

async function loadCourseIds(certificateId: string) {
  const links = await db
    .select({ courseId: academyCertificateCourses.courseId })
    .from(academyCertificateCourses)
    .where(eq(academyCertificateCourses.certificateId, certificateId))
    .orderBy(asc(academyCertificateCourses.sortOrder), asc(academyCertificateCourses.courseId));
  return links.map((link) => link.courseId);
}

async function syncCertificateCourses(certificateId: string, courseIds: string[]) {
  const uniqueIds = [...new Set(courseIds.filter(Boolean))];
  await db.delete(academyCertificateCourses).where(eq(academyCertificateCourses.certificateId, certificateId));
  if (!uniqueIds.length) return;
  await db.insert(academyCertificateCourses).values(
    uniqueIds.map((courseId, index) => ({
      certificateId,
      courseId,
      sortOrder: (index + 1) * 10,
    })),
  );
}

function mapDetail(
  row: typeof academyCertificates.$inferSelect,
  translations: Array<typeof academyCertificateTranslations.$inferSelect>,
  courseIds: string[],
  defaultLocale: string,
): AdminAcademyCertificateDetail {
  const display = pickTranslationForDisplay(translations, defaultLocale);
  return {
    ...mapListItem(row, resolveAcademyDisplayTitle(display, row.slug), translations.length, courseIds.length),
    courseIds,
    translations: translations.map(mapTranslation),
  };
}

export async function getAdminAcademyCertificateList() {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const rows = await db.select().from(academyCertificates).orderBy(asc(academyCertificates.sortOrder), asc(academyCertificates.slug));
  const ids = rows.map((row) => row.id);
  const translations = ids.length
    ? await db.select().from(academyCertificateTranslations).where(inArray(academyCertificateTranslations.certificateId, ids))
    : [];
  const courseCounts = ids.length
    ? await db
      .select({
        certificateId: academyCertificateCourses.certificateId,
        count: sql<number>`count(*)::int`,
      })
      .from(academyCertificateCourses)
      .where(inArray(academyCertificateCourses.certificateId, ids))
      .groupBy(academyCertificateCourses.certificateId)
    : [];
  const countById = new Map(courseCounts.map((row) => [row.certificateId, row.count]));
  const byId = new Map<string, (typeof academyCertificateTranslations.$inferSelect)[]>();
  for (const row of translations) {
    const bucket = byId.get(row.certificateId) ?? [];
    bucket.push(row);
    byId.set(row.certificateId, bucket);
  }
  const items = rows.map((row) => {
    const rowTranslations = byId.get(row.id) ?? [];
    const display = pickTranslationForDisplay(rowTranslations, defaultLocale);
    return mapListItem(
      row,
      resolveAcademyDisplayTitle(display, row.slug),
      rowTranslations.length,
      countById.get(row.id) ?? 0,
    );
  });
  return { items, total: items.length };
}

export async function getAdminAcademyCertificateDetail(id: string): Promise<AdminAcademyCertificateDetail | null> {
  const [row] = await db.select().from(academyCertificates).where(eq(academyCertificates.id, id)).limit(1);
  if (!row) return null;
  const translations = await db
    .select()
    .from(academyCertificateTranslations)
    .where(eq(academyCertificateTranslations.certificateId, id))
    .orderBy(asc(academyCertificateTranslations.locale));
  const courseIds = await loadCourseIds(id);
  const defaultLocale = await getDefaultSiteLanguageCode();
  return mapDetail(row, translations, courseIds, defaultLocale);
}

function assertSlugAvailable(slug: string) {
  if (reservedAcademyCertificateSlugs.includes(slug as (typeof reservedAcademyCertificateSlugs)[number])) {
    throw new Error('SLUG_RESERVED');
  }
}

export async function createAdminAcademyCertificate(input: unknown) {
  const parsed = adminAcademyCertificateCreateSchema.parse(input);
  const slug = normalizeSlug(parsed.slug ?? parsed.translation.title);
  if (!slug) throw new Error('SLUG_INVALID');
  assertSlugAvailable(slug);
  const [existing] = await db.select({ id: academyCertificates.id }).from(academyCertificates).where(eq(academyCertificates.slug, slug)).limit(1);
  if (existing) throw new Error('SLUG_EXISTS');

  const [maxSort] = await db.select({ sortOrder: academyCertificates.sortOrder }).from(academyCertificates).orderBy(desc(academyCertificates.sortOrder)).limit(1);
  const cover = await resolveCoverFieldsForWrite({
    coverMode: parsed.coverMode,
    coverValue: parsed.coverValue,
  });

  const status = parsed.status ?? 'published';
  const [inserted] = await db.insert(academyCertificates).values({
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
  }).returning({ id: academyCertificates.id });

  await upsertAdminAcademyCertificateTranslation(inserted.id, parsed.translation);
  await syncCertificateCourses(inserted.id, parsed.courseIds ?? []);
  return getAdminAcademyCertificateDetail(inserted.id);
}

export async function updateAdminAcademyCertificate(id: string, input: unknown) {
  const parsed = adminAcademyCertificatePatchSchema.parse(input);
  const [current] = await db.select().from(academyCertificates).where(eq(academyCertificates.id, id)).limit(1);
  if (!current) return null;

  let nextSlug = current.slug;
  if (parsed.slug !== undefined) {
    const slug = normalizeSlug(parsed.slug);
    if (!slug) throw new Error('SLUG_INVALID');
    assertSlugAvailable(slug);
    if (slug !== current.slug) {
      const [dup] = await db.select({ id: academyCertificates.id }).from(academyCertificates).where(eq(academyCertificates.slug, slug)).limit(1);
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
  await db.update(academyCertificates).set({
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
  }).where(eq(academyCertificates.id, id));

  if (parsed.courseIds !== undefined) {
    await syncCertificateCourses(id, parsed.courseIds);
  }

  return getAdminAcademyCertificateDetail(id);
}

export async function upsertAdminAcademyCertificateTranslation(certificateId: string, input: unknown) {
  const parsed = adminAcademyCertificateTranslationSchema.parse(input);
  const [certificate] = await db.select({ id: academyCertificates.id }).from(academyCertificates).where(eq(academyCertificates.id, certificateId)).limit(1);
  if (!certificate) return null;

  const stats = normalizeAcademyStats(parsed.stats);
  const learnings = normalizeStringTags(parsed.learnings);
  const skills = normalizeStringTags(parsed.skills);
  const tools = normalizeStringTags(parsed.tools);

  const [existing] = await db.select().from(academyCertificateTranslations)
    .where(and(eq(academyCertificateTranslations.certificateId, certificateId), eq(academyCertificateTranslations.locale, parsed.locale)))
    .limit(1);

  if (existing) {
    const [updated] = await db.update(academyCertificateTranslations).set({
      title: parsed.title,
      summary: parsed.summary ?? '',
      description: parsed.description ?? '',
      seoTitle: parsed.seoTitle ?? '',
      seoDescription: parsed.seoDescription ?? '',
      stats,
      learnings,
      skills,
      tools,
      updatedAt: new Date(),
    }).where(eq(academyCertificateTranslations.id, existing.id)).returning();
    return mapTranslation(updated);
  }

  const [inserted] = await db.insert(academyCertificateTranslations).values({
    certificateId,
    locale: parsed.locale,
    title: parsed.title,
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

export async function deleteAdminAcademyCertificate(id: string) {
  const [deleted] = await db.delete(academyCertificates).where(eq(academyCertificates.id, id)).returning({ id: academyCertificates.id });
  return Boolean(deleted);
}

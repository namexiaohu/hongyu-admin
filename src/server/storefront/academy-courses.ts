import 'server-only';

import { and, asc, eq, inArray } from 'drizzle-orm';

import { normalizeAcademyStats, normalizeStringTags } from '@/lib/academy-content-shared';
import type { AcademyLessonMaterial } from '@/lib/academy-lesson-content';
import { resolveStorefrontCoverUrl } from '@/lib/cover-presets';
import { resolveStorefrontHeroCoverDisplay, type HeroCoverDisplay } from '@/lib/hero-cover-display';
import { resolveOssAssetUrl } from '@/lib/oss-asset-url';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import type { ProductGalleryImage } from '@/lib/product-content';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { db } from '@/server/db';
import {
  academyCourseTranslations,
  academyCourses,
  academyLessonTranslations,
  academyLessons,
  academyUnitTranslations,
  academyUnits,
} from '@/server/db/schema';
import { listPublishedLinksForCourse } from '@/server/storefront/academy-certificate-courses';

export type StorefrontAcademyCourseListItem = {
  slug: string;
  href: string;
  title: string;
  summary: string;
  coverImage: string;
  teacherCount: number;
  studentCount: number;
};

export type StorefrontAcademyCourseCertificateLink = {
  slug: string;
  href: string;
  title: string;
};

export type StorefrontAcademyCertificateCourseLink = {
  certificateCourseId: string;
  certificateSlug: string;
  certificateTitle: string;
  href: string;
  sortOrder: number;
};

export type StorefrontAcademyLessonMaterial = {
  name: string;
  url: string;
  mimeType: string;
  size: number | null;
  sizeLabel: string;
};

export type StorefrontAcademyLessonItem = {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  durationSeconds: number;
  durationLabel: string;
  sortOrder: number;
  materials: StorefrontAcademyLessonMaterial[];
};

export type StorefrontAcademyUnitItem = {
  id: string;
  title: string;
  coverImage: string;
  sortOrder: number;
  lessons: StorefrontAcademyLessonItem[];
};

export type StorefrontAcademyCourseDetail = {
  slug: string;
  locale: string;
  title: string;
  summary: string;
  description: string;
  coverImage: string;
  gallery: Array<{ url: string; alt: string }>;
  videoUrl: string;
  showCoverOnBackground: boolean;
  coverDisplay: HeroCoverDisplay;
  teacherCount: number;
  studentCount: number;
  stats: Array<{ label: string; value: string }>;
  learnings: string[];
  skills: string[];
  tools: string[];
  units: StorefrontAcademyUnitItem[];
  certificates: StorefrontAcademyCourseCertificateLink[];
  certificateLinks: StorefrontAcademyCertificateCourseLink[];
  seo: { title: string; description: string };
};

export type StorefrontAcademyCourseListResponse = {
  locale: string;
  page: number;
  pageSize: number;
  total: number;
  items: StorefrontAcademyCourseListItem[];
};

function resolveCover(row: { coverMode: string; coverValue: string; coverImage: string }) {
  return resolveStorefrontCoverUrl({
    mode: row.coverMode,
    value: row.coverValue,
    legacyCoverImageKey: row.coverImage,
    toPublicUrl: resolveOssAssetUrl,
  });
}

function mapTranslationFields(row: typeof academyCourseTranslations.$inferSelect) {
  return {
    title: row.title,
    summary: row.summary,
    description: row.description,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    stats: normalizeAcademyStats(row.stats ?? []).filter((item) => item.label && item.value),
    learnings: normalizeStringTags(row.learnings ?? []),
    skills: normalizeStringTags(row.skills ?? []),
    tools: normalizeStringTags(row.tools ?? []),
  };
}

export async function getStorefrontAcademyCourseList(input: {
  locale?: string;
  page?: number;
  pageSize?: number;
}): Promise<StorefrontAcademyCourseListResponse> {
  const locale = input.locale?.trim() || await getDefaultSiteLanguageCode();
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 24));

  const rows = await db
    .select()
    .from(academyCourses)
    .where(eq(academyCourses.status, 'published'))
    .orderBy(asc(academyCourses.sortOrder), asc(academyCourses.slug));

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

  const allItems = rows.map((row) => {
    const t = pickTranslationForDisplay(byId.get(row.id) ?? [], locale);
    return {
      slug: row.slug,
      href: `/courses/${row.slug}`,
      title: t?.title || row.slug,
      summary: t?.summary || '',
      coverImage: resolveCover(row),
      teacherCount: row.teacherCount,
      studentCount: row.studentCount,
    };
  });

  const total = allItems.length;
  const start = (page - 1) * pageSize;
  const items = allItems.slice(start, start + pageSize);
  return { locale, page, pageSize, total, items };
}

function formatDurationLabel(seconds: number) {
  const total = Math.max(0, Math.round(seconds || 0));
  if (total < 60) return `${total}秒`;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) {
    if (minutes > 0) return `${hours}小时${minutes}分钟`;
    return `${hours}小时`;
  }
  if (secs > 0 && minutes < 5) return `${minutes}分钟${secs}秒`;
  return `${minutes}分钟`;
}

function formatFileSizeLabel(bytes: number | null | undefined) {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mapLessonMaterials(raw: AcademyLessonMaterial[] | null | undefined): StorefrontAcademyLessonMaterial[] {
  return (raw ?? [])
    .map((item) => {
      const url = item.url?.trim() ? resolveOssAssetUrl(item.url) : '';
      if (!url) return null;
      return {
        name: item.name?.trim() || 'Attachment',
        url,
        mimeType: item.mimeType?.trim() || 'application/octet-stream',
        size: item.size ?? null,
        sizeLabel: formatFileSizeLabel(item.size),
      };
    })
    .filter((item): item is StorefrontAcademyLessonMaterial => Boolean(item));
}

async function loadCourseUnits(courseId: string, locale: string): Promise<StorefrontAcademyUnitItem[]> {
  const units = await db
    .select()
    .from(academyUnits)
    .where(eq(academyUnits.courseId, courseId))
    .orderBy(asc(academyUnits.sortOrder), asc(academyUnits.createdAt));
  if (!units.length) return [];

  const unitIds = units.map((unit) => unit.id);
  const [unitTranslations, lessons] = await Promise.all([
    db.select().from(academyUnitTranslations).where(inArray(academyUnitTranslations.unitId, unitIds)),
    db
      .select()
      .from(academyLessons)
      .where(inArray(academyLessons.unitId, unitIds))
      .orderBy(asc(academyLessons.sortOrder), asc(academyLessons.createdAt)),
  ]);

  const lessonIds = lessons.map((lesson) => lesson.id);
  const lessonTranslations = lessonIds.length
    ? await db.select().from(academyLessonTranslations).where(inArray(academyLessonTranslations.lessonId, lessonIds))
    : [];

  const unitTById = new Map<string, (typeof academyUnitTranslations.$inferSelect)[]>();
  for (const row of unitTranslations) {
    const bucket = unitTById.get(row.unitId) ?? [];
    bucket.push(row);
    unitTById.set(row.unitId, bucket);
  }
  const lessonTById = new Map<string, (typeof academyLessonTranslations.$inferSelect)[]>();
  for (const row of lessonTranslations) {
    const bucket = lessonTById.get(row.lessonId) ?? [];
    bucket.push(row);
    lessonTById.set(row.lessonId, bucket);
  }
  const lessonsByUnit = new Map<string, typeof lessons>();
  for (const lesson of lessons) {
    const bucket = lessonsByUnit.get(lesson.unitId) ?? [];
    bucket.push(lesson);
    lessonsByUnit.set(lesson.unitId, bucket);
  }

  return units.map((unit) => {
    const ut = pickTranslationForDisplay(unitTById.get(unit.id) ?? [], locale);
    const unitLessons = (lessonsByUnit.get(unit.id) ?? []).map((lesson) => {
      const lt = pickTranslationForDisplay(lessonTById.get(lesson.id) ?? [], locale);
      return {
        id: lesson.id,
        title: lt?.title?.trim() || 'Lesson',
        description: lt?.description?.trim() || '',
        videoUrl: lesson.videoUrl?.trim() ? resolveOssAssetUrl(lesson.videoUrl) : '',
        durationSeconds: lesson.durationSeconds,
        durationLabel: formatDurationLabel(lesson.durationSeconds),
        sortOrder: lesson.sortOrder,
        materials: mapLessonMaterials(lesson.materials as AcademyLessonMaterial[]),
      };
    });
    return {
      id: unit.id,
      title: ut?.title?.trim() || 'Unit',
      coverImage: resolveCover(unit),
      sortOrder: unit.sortOrder,
      lessons: unitLessons,
    };
  });
}

export async function getStorefrontAcademyCourseBySlug(
  slug: string,
  locale?: string,
): Promise<StorefrontAcademyCourseDetail | null> {
  const resolvedLocale = locale?.trim() || await getDefaultSiteLanguageCode();
  const [row] = await db
    .select()
    .from(academyCourses)
    .where(and(eq(academyCourses.slug, slug), eq(academyCourses.status, 'published')))
    .limit(1);
  if (!row) return null;

  const translations = await db
    .select()
    .from(academyCourseTranslations)
    .where(eq(academyCourseTranslations.courseId, row.id));
  const t = pickTranslationForDisplay(translations, resolvedLocale);
  if (!t) return null;
  const fields = mapTranslationFields(t);

  const certificateLinks = await listPublishedLinksForCourse(row.id, resolvedLocale);
  const certificates: StorefrontAcademyCourseCertificateLink[] = certificateLinks.map((link) => ({
    slug: link.certificateSlug,
    href: link.href,
    title: link.certificateTitle,
  }));

  const units = await loadCourseUnits(row.id, resolvedLocale);

  return {
    slug: row.slug,
    locale: resolvedLocale,
    title: fields.title,
    summary: fields.summary,
    description: fields.description,
    coverImage: resolveCover(row),
    gallery: ((row.gallery ?? []) as ProductGalleryImage[])
      .map((item) => ({
        url: item.url?.trim() ? resolveOssAssetUrl(item.url) : '',
        alt: item.alt?.trim() || fields.title,
      }))
      .filter((item) => item.url),
    videoUrl: row.videoUrl?.trim() ? resolveOssAssetUrl(row.videoUrl) : '',
    showCoverOnBackground: Boolean(row.showCoverOnBackground),
    coverDisplay: resolveStorefrontHeroCoverDisplay(row.coverDisplay),
    teacherCount: row.teacherCount,
    studentCount: row.studentCount,
    stats: fields.stats,
    learnings: fields.learnings,
    skills: fields.skills,
    tools: fields.tools,
    units,
    certificates,
    certificateLinks,
    seo: {
      title: fields.seoTitle || fields.title,
      description: fields.seoDescription || fields.summary,
    },
  };
}

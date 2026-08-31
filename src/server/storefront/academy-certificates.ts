import 'server-only';

import { and, asc, desc, eq, inArray } from 'drizzle-orm';

import { normalizeAcademyStats, normalizeStringTags } from '@/lib/academy-content-shared';
import { resolveStorefrontCoverUrl } from '@/lib/cover-presets';
import { resolveStorefrontHeroCoverDisplay, type HeroCoverDisplay } from '@/lib/hero-cover-display';
import { resolveOssAssetUrl } from '@/lib/oss-asset-url';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import type { ProductGalleryImage } from '@/lib/product-content';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { db } from '@/server/db';
import {
  academyCertificateCourses,
  academyCertificateTranslations,
  academyCertificates,
  academyCourseTranslations,
  academyCourses,
  academyUnitTranslations,
  academyUnits,
} from '@/server/db/schema';
import { academyCourseDetailPath } from '@/server/storefront/academy-certificate-courses';

export type StorefrontAcademyCertificateListItem = {
  slug: string;
  href: string;
  title: string;
  subtitle: string;
  badgeLabel: string;
  summary: string;
  coverImage: string;
  teacherCount: number;
  studentCount: number;
  courseCount: number;
  skills: string[];
};

export type StorefrontAcademyCertificateUnitItem = {
  id: string;
  title: string;
  sortOrder: number;
};

export type StorefrontAcademyCertificateCourseItem = {
  certificateCourseId: string;
  slug: string;
  href: string;
  title: string;
  summary: string;
  coverImage: string;
  sortOrder: number;
  units: StorefrontAcademyCertificateUnitItem[];
};

export type StorefrontAcademyCertificateDetail = {
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
  courses: StorefrontAcademyCertificateCourseItem[];
  examHint: {
    hasExam: boolean;
    questionCount?: number;
    passScorePercent?: number;
    totalCourses?: number;
  };
  seo: { title: string; description: string };
};

export type StorefrontAcademyCertificateListResponse = {
  locale: string;
  page: number;
  pageSize: number;
  total: number;
  items: StorefrontAcademyCertificateListItem[];
};

function resolveCover(row: { coverMode: string; coverValue: string; coverImage: string }) {
  return resolveStorefrontCoverUrl({
    mode: row.coverMode,
    value: row.coverValue,
    legacyCoverImageKey: row.coverImage,
    toPublicUrl: resolveOssAssetUrl,
  });
}

function mapTranslationFields(row: typeof academyCertificateTranslations.$inferSelect) {
  return {
    title: row.title,
    subtitle: row.subtitle ?? '',
    badgeLabel: row.badgeLabel ?? '',
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

export async function getStorefrontAcademyCertificateList(input: {
  locale?: string;
  page?: number;
  pageSize?: number;
  q?: string;
}): Promise<StorefrontAcademyCertificateListResponse> {
  const locale = input.locale?.trim() || await getDefaultSiteLanguageCode();
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 24));

  const rows = await db
    .select()
    .from(academyCertificates)
    .where(eq(academyCertificates.status, 'published'))
    .orderBy(desc(academyCertificates.createdAt), asc(academyCertificates.slug));

  const ids = rows.map((row) => row.id);
  const translations = ids.length
    ? await db.select().from(academyCertificateTranslations).where(inArray(academyCertificateTranslations.certificateId, ids))
    : [];
  const courseCounts = ids.length
    ? await db.select().from(academyCertificateCourses).where(inArray(academyCertificateCourses.certificateId, ids))
    : [];
  const countById = new Map<string, number>();
  for (const link of courseCounts) {
    countById.set(link.certificateId, (countById.get(link.certificateId) ?? 0) + 1);
  }
  const byId = new Map<string, (typeof academyCertificateTranslations.$inferSelect)[]>();
  for (const row of translations) {
    const bucket = byId.get(row.certificateId) ?? [];
    bucket.push(row);
    byId.set(row.certificateId, bucket);
  }

  const allItems = rows.map((row) => {
    const t = pickTranslationForDisplay(byId.get(row.id) ?? [], locale);
    const fields = t ? mapTranslationFields(t) : { title: row.slug, subtitle: '', badgeLabel: '', summary: '', description: '', seoTitle: '', seoDescription: '', stats: [], learnings: [], skills: [], tools: [] };
    return {
      slug: row.slug,
      href: `/certificates/${row.slug}`,
      title: fields.title,
      subtitle: fields.subtitle,
      badgeLabel: fields.badgeLabel,
      summary: fields.summary,
      coverImage: resolveCover(row),
      teacherCount: row.teacherCount,
      studentCount: row.studentCount,
      courseCount: countById.get(row.id) ?? 0,
      skills: fields.skills,
    };
  });

  const needle = input.q?.trim().toLowerCase() ?? '';
  const matched = needle
    ? allItems.filter((item) => {
        const hay = [item.title, item.subtitle, item.summary, ...item.skills]
          .join('\n')
          .toLowerCase();
        return hay.includes(needle);
      })
    : allItems;

  const total = matched.length;
  const start = (page - 1) * pageSize;
  const items = matched.slice(start, start + pageSize);
  return { locale, page, pageSize, total, items };
}

export async function getStorefrontAcademyCertificateBySlug(
  slug: string,
  locale?: string,
): Promise<StorefrontAcademyCertificateDetail | null> {
  const resolvedLocale = locale?.trim() || await getDefaultSiteLanguageCode();
  const [row] = await db
    .select()
    .from(academyCertificates)
    .where(and(eq(academyCertificates.slug, slug), eq(academyCertificates.status, 'published')))
    .limit(1);
  if (!row) return null;

  const translations = await db
    .select()
    .from(academyCertificateTranslations)
    .where(eq(academyCertificateTranslations.certificateId, row.id));
  const t = pickTranslationForDisplay(translations, resolvedLocale);
  if (!t) return null;
  const fields = mapTranslationFields(t);

  const links = await db
    .select({
      id: academyCertificateCourses.id,
      courseId: academyCertificateCourses.courseId,
      sortOrder: academyCertificateCourses.sortOrder,
    })
    .from(academyCertificateCourses)
    .where(eq(academyCertificateCourses.certificateId, row.id))
    .orderBy(asc(academyCertificateCourses.sortOrder));

  const courseIds = links.map((link) => link.courseId);
  const courseRows = courseIds.length
    ? await db.select().from(academyCourses).where(inArray(academyCourses.id, courseIds))
    : [];
  const courseTranslations = courseIds.length
    ? await db.select().from(academyCourseTranslations).where(inArray(academyCourseTranslations.courseId, courseIds))
    : [];
  const courseById = new Map(courseRows.map((course) => [course.id, course]));
  const courseTById = new Map<string, (typeof academyCourseTranslations.$inferSelect)[]>();
  for (const ct of courseTranslations) {
    const bucket = courseTById.get(ct.courseId) ?? [];
    bucket.push(ct);
    courseTById.set(ct.courseId, bucket);
  }

  const publishedCourseIds = links
    .map((link) => courseById.get(link.courseId))
    .filter((course): course is NonNullable<typeof course> => Boolean(course && course.status === 'published'))
    .map((course) => course.id);

  const unitRows = publishedCourseIds.length
    ? await db
        .select()
        .from(academyUnits)
        .where(inArray(academyUnits.courseId, publishedCourseIds))
        .orderBy(asc(academyUnits.sortOrder), asc(academyUnits.createdAt))
    : [];
  const unitIds = unitRows.map((unit) => unit.id);
  const unitTranslations = unitIds.length
    ? await db.select().from(academyUnitTranslations).where(inArray(academyUnitTranslations.unitId, unitIds))
    : [];
  const unitTById = new Map<string, (typeof academyUnitTranslations.$inferSelect)[]>();
  for (const ut of unitTranslations) {
    const bucket = unitTById.get(ut.unitId) ?? [];
    bucket.push(ut);
    unitTById.set(ut.unitId, bucket);
  }
  const unitsByCourse = new Map<string, StorefrontAcademyCertificateUnitItem[]>();
  for (const unit of unitRows) {
    const ut = pickTranslationForDisplay(unitTById.get(unit.id) ?? [], resolvedLocale);
    const bucket = unitsByCourse.get(unit.courseId) ?? [];
    bucket.push({
      id: unit.id,
      title: ut?.title?.trim() ?? '',
      sortOrder: unit.sortOrder,
    });
    unitsByCourse.set(unit.courseId, bucket);
  }

  const courses: StorefrontAcademyCertificateCourseItem[] = links
    .map((link) => {
      const course = courseById.get(link.courseId);
      if (!course || course.status !== 'published') return null;
      const ct = pickTranslationForDisplay(courseTById.get(course.id) ?? [], resolvedLocale);
      return {
        certificateCourseId: link.id,
        slug: course.slug,
        href: academyCourseDetailPath(course.slug, link.id),
        title: ct?.title?.trim() ?? '',
        summary: ct?.summary || '',
        coverImage: resolveCover(course),
        sortOrder: link.sortOrder,
        units: unitsByCourse.get(course.id) ?? [],
      };
    })
    .filter((item): item is StorefrontAcademyCertificateCourseItem => Boolean(item));

  const { getPublicCertificateExamHint } = await import('@/server/storefront/academy-certificate-learning');
  const examHintRaw = await getPublicCertificateExamHint(slug, resolvedLocale);
  const examHint = examHintRaw?.hasExam
    ? {
        hasExam: true as const,
        questionCount: examHintRaw.questionCount,
        passScorePercent: examHintRaw.passScorePercent,
        totalCourses: examHintRaw.totalCourses,
      }
    : { hasExam: false as const };

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
    courses,
    examHint,
    seo: {
      title: fields.seoTitle || fields.title,
      description: fields.seoDescription || fields.summary,
    },
  };
}

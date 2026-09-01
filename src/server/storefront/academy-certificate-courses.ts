import 'server-only';

import { and, asc, eq, inArray } from 'drizzle-orm';

import { pickTranslationForLocale } from '@/lib/pick-translation-for-display';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { db } from '@/server/db';
import {
  academyCertificateCourses,
  academyCertificateTranslations,
  academyCertificates,
  academyCourseTranslations,
  academyCourses,
} from '@/server/db/schema';

export type AcademyCertificateCourseContext = {
  certificateCourseId: string;
  certificateId: string;
  courseId: string;
  certificateSlug: string;
  certificateTitle: string;
  courseSlug: string;
  courseTitle: string;
  sortOrder: number;
};

export function academyCourseDetailPath(courseSlug: string, certificateCourseId: string) {
  return `/courses/${courseSlug}?certificateCourseId=${encodeURIComponent(certificateCourseId)}`;
}

export function academyLearnPath(courseSlug: string, certificateCourseId: string) {
  return `/courses/${courseSlug}/learn?certificateCourseId=${encodeURIComponent(certificateCourseId)}`;
}

export async function getCertificateCourseContext(
  certificateCourseId: string,
  locale?: string,
): Promise<AcademyCertificateCourseContext | null> {
  const [link] = await db
    .select({
      id: academyCertificateCourses.id,
      certificateId: academyCertificateCourses.certificateId,
      courseId: academyCertificateCourses.courseId,
      sortOrder: academyCertificateCourses.sortOrder,
      certificateSlug: academyCertificates.slug,
      certificateStatus: academyCertificates.status,
      courseSlug: academyCourses.slug,
      courseStatus: academyCourses.status,
    })
    .from(academyCertificateCourses)
    .innerJoin(academyCertificates, eq(academyCertificates.id, academyCertificateCourses.certificateId))
    .innerJoin(academyCourses, eq(academyCourses.id, academyCertificateCourses.courseId))
    .where(eq(academyCertificateCourses.id, certificateCourseId))
    .limit(1);

  if (!link || link.certificateStatus !== 'published' || link.courseStatus !== 'published') {
    return null;
  }

  const defaultLocale = await getDefaultSiteLanguageCode();
  const resolvedLocale = locale?.trim() || defaultLocale;
  const [certTranslations, courseTranslations] = await Promise.all([
    db
      .select()
      .from(academyCertificateTranslations)
      .where(eq(academyCertificateTranslations.certificateId, link.certificateId)),
    db
      .select()
      .from(academyCourseTranslations)
      .where(eq(academyCourseTranslations.courseId, link.courseId)),
  ]);
  const certDisplay = pickTranslationForLocale(certTranslations, resolvedLocale, defaultLocale);
  const courseDisplay = pickTranslationForLocale(courseTranslations, resolvedLocale, defaultLocale);
  if (!certDisplay?.title?.trim() || !courseDisplay?.title?.trim()) {
    return null;
  }

  return {
    certificateCourseId: link.id,
    certificateId: link.certificateId,
    courseId: link.courseId,
    certificateSlug: link.certificateSlug,
    certificateTitle: certDisplay.title.trim(),
    courseSlug: link.courseSlug,
    courseTitle: courseDisplay.title.trim(),
    sortOrder: link.sortOrder,
  };
}

export async function listPublishedLinksForCourse(courseId: string, locale?: string) {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const resolvedLocale = locale?.trim() || defaultLocale;
  const rows = await db
    .select({
      id: academyCertificateCourses.id,
      certificateId: academyCertificateCourses.certificateId,
      certificateSlug: academyCertificates.slug,
      sortOrder: academyCertificateCourses.sortOrder,
    })
    .from(academyCertificateCourses)
    .innerJoin(academyCertificates, eq(academyCertificates.id, academyCertificateCourses.certificateId))
    .where(
      and(
        eq(academyCertificateCourses.courseId, courseId),
        eq(academyCertificates.status, 'published'),
      ),
    )
    .orderBy(asc(academyCertificateCourses.sortOrder), asc(academyCertificates.slug));

  if (!rows.length) return [];

  const ids = rows.map((row) => row.certificateId);
  const translations = await db
    .select()
    .from(academyCertificateTranslations)
    .where(inArray(academyCertificateTranslations.certificateId, ids));
  const byCert = new Map<string, typeof translations>();
  for (const row of translations) {
    const list = byCert.get(row.certificateId) ?? [];
    list.push(row);
    byCert.set(row.certificateId, list);
  }

  return rows.flatMap((row) => {
    const display = pickTranslationForLocale(byCert.get(row.certificateId) ?? [], resolvedLocale, defaultLocale);
    const certificateTitle = display?.title?.trim();
    if (!certificateTitle) return [];
    return [{
      certificateCourseId: row.id,
      certificateSlug: row.certificateSlug,
      certificateTitle,
      href: `/certificates/${row.certificateSlug}`,
      sortOrder: row.sortOrder,
    }];
  });
}

export type CertificateCourseMeta = {
  certificateCourseId: string;
  certificateSlug: string;
  certificateTitle: string;
};

export async function getCertificateCourseMetaByIds(
  certificateCourseIds: string[],
  locale?: string,
): Promise<Map<string, CertificateCourseMeta>> {
  const ids = [...new Set(certificateCourseIds.filter(Boolean))];
  const result = new Map<string, CertificateCourseMeta>();
  if (!ids.length) return result;

  const defaultLocale = await getDefaultSiteLanguageCode();
  const resolvedLocale = locale?.trim() || defaultLocale;
  const rows = await db
    .select({
      id: academyCertificateCourses.id,
      certificateId: academyCertificateCourses.certificateId,
      certificateSlug: academyCertificates.slug,
    })
    .from(academyCertificateCourses)
    .innerJoin(academyCertificates, eq(academyCertificates.id, academyCertificateCourses.certificateId))
    .where(inArray(academyCertificateCourses.id, ids));

  if (!rows.length) return result;

  const certIds = [...new Set(rows.map((row) => row.certificateId))];
  const translations = await db
    .select()
    .from(academyCertificateTranslations)
    .where(inArray(academyCertificateTranslations.certificateId, certIds));
  const byCert = new Map<string, typeof translations>();
  for (const row of translations) {
    const list = byCert.get(row.certificateId) ?? [];
    list.push(row);
    byCert.set(row.certificateId, list);
  }

  for (const row of rows) {
    const display = pickTranslationForLocale(byCert.get(row.certificateId) ?? [], resolvedLocale, defaultLocale);
    const certificateTitle = display?.title?.trim();
    if (!certificateTitle) continue;
    result.set(row.id, {
      certificateCourseId: row.id,
      certificateSlug: row.certificateSlug,
      certificateTitle,
    });
  }
  return result;
}


import 'server-only';

import { asc, eq, inArray } from 'drizzle-orm';

import {
  adminAcademyCertificateCoursesPatchSchema,
  type AdminAcademyCertificateCourseItem,
} from '@/lib/academy-certificate-content';
import { normalizeAcademyListingStatus } from '@/lib/academy-content-shared';
import { resolveAdminRowMediaPreviews } from '@/lib/admin-media-previews';
import { resolveOssAssetUrl } from '@/lib/oss-asset-url';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { syncCertificateCourses } from '@/server/admin/academy-certificates';
import { db } from '@/server/db';
import {
  academyCertificateCourses,
  academyCertificates,
  academyCourseTranslations,
  academyCourses,
} from '@/server/db/schema';

export type { AdminAcademyCertificateCourseItem };

export async function listAdminAcademyCertificateCourses(
  certificateId: string,
): Promise<AdminAcademyCertificateCourseItem[]> {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const links = await db
    .select()
    .from(academyCertificateCourses)
    .where(eq(academyCertificateCourses.certificateId, certificateId))
    .orderBy(asc(academyCertificateCourses.sortOrder), asc(academyCertificateCourses.courseId));

  if (!links.length) return [];

  const courseIds = links.map((link) => link.courseId);
  const courses = await db.select().from(academyCourses).where(inArray(academyCourses.id, courseIds));
  const translations = await db
    .select()
    .from(academyCourseTranslations)
    .where(inArray(academyCourseTranslations.courseId, courseIds));

  const courseById = new Map(courses.map((row) => [row.id, row]));
  const tByCourse = new Map<string, typeof translations>();
  for (const row of translations) {
    const bucket = tByCourse.get(row.courseId) ?? [];
    bucket.push(row);
    tByCourse.set(row.courseId, bucket);
  }

  return links.map((link) => {
    const course = courseById.get(link.courseId);
    const display = pickTranslationForDisplay(tByCourse.get(link.courseId) ?? [], defaultLocale);
    const { cover } = course
      ? resolveAdminRowMediaPreviews(course, resolveOssAssetUrl)
      : { cover: { previewUrl: '' } };
    return {
      courseId: link.courseId,
      sortOrder: link.sortOrder,
      title: display?.title?.trim() || course?.slug || 'Untitled course',
      slug: course?.slug ?? '',
      status: normalizeAcademyListingStatus(course?.status ?? 'draft'),
      coverPreviewUrl: cover.previewUrl,
    };
  });
}

export async function updateAdminAcademyCertificateCourses(certificateId: string, input: unknown) {
  const parsed = adminAcademyCertificateCoursesPatchSchema.parse(input);
  const [certificate] = await db
    .select({ id: academyCertificates.id })
    .from(academyCertificates)
    .where(eq(academyCertificates.id, certificateId))
    .limit(1);
  if (!certificate) return null;

  if (parsed.courseIds.length) {
    const courses = await db
      .select({ id: academyCourses.id })
      .from(academyCourses)
      .where(inArray(academyCourses.id, parsed.courseIds));
    if (courses.length !== parsed.courseIds.length) {
      throw new Error('INVALID_COURSE_IDS');
    }
  }

  await syncCertificateCourses(certificateId, parsed.courseIds);
  return listAdminAcademyCertificateCourses(certificateId);
}

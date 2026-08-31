import 'server-only';

import { and, asc, desc, eq, inArray } from 'drizzle-orm';

import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import {
  getCompletedLessonIdsForUser,
  isCourseCompleteForUser,
} from '@/server/storefront/academy-course-completion';
import { getCertificateProgress, syncCertificateProgress } from '@/server/storefront/academy-certificate-progress';
import { academyLearnPath } from '@/server/storefront/academy-certificate-courses';
import { getCertificateExamMeta } from '@/server/storefront/academy-exams';
import { getUserCertificateForCertificate } from '@/server/storefront/academy-user-certificates';
import { db } from '@/server/db';
import {
  academyCertificateCourseProgress,
  academyCertificateCourses,
  academyCertificates,
  academyCourses,
  academyCourseTranslations,
  academyLessons,
  academyLessonTranslations,
  academyUnits,
  academyUnitTranslations,
} from '@/server/db/schema';

export type CertificateLearningStatus = 'not_started' | 'learning' | 'courses_complete' | 'exam_passed';

export type CertificateLearningState = {
  status: CertificateLearningStatus;
  progress: {
    completedLessons: number;
    totalLessons: number;
    progressPercent: number;
  } | null;
  exam: {
    hasExam: boolean;
    questionCount: number;
    passScorePercent: number;
    examTitle: string;
  } | null;
  examResult: {
    passed: boolean;
    score: number | null;
    totalScore: number | null;
    certificateNumber: string;
    certificateHref: string;
  } | null;
  continueLearnHref: string | null;
  continueWatch: {
    unitTitle: string;
    lessonTitle: string;
    positionSeconds: number;
    durationSeconds: number;
  } | null;
  courses: Array<{
    certificateCourseId: string;
    slug: string;
    title: string;
    sortOrder: number;
    courseIndex: number;
    isComplete: boolean;
    href: string;
    learnHref: string;
    units: Array<{
      id: string;
      title: string;
      sortOrder: number;
      isComplete: boolean;
      lessons: Array<{
        id: string;
        title: string;
        sortOrder: number;
        isComplete: boolean;
        durationSeconds: number;
      }>;
    }>;
  }>;
};

export async function getCertificateLearningState(
  userId: string,
  certificateSlug: string,
  locale?: string,
): Promise<CertificateLearningState | null> {
  const resolvedLocale = locale?.trim() || (await getDefaultSiteLanguageCode());

  const [certificate] = await db
    .select({ id: academyCertificates.id, slug: academyCertificates.slug })
    .from(academyCertificates)
    .where(and(eq(academyCertificates.slug, certificateSlug), eq(academyCertificates.status, 'published')))
    .limit(1);
  if (!certificate) return null;

  const links = await db
    .select({
      id: academyCertificateCourses.id,
      courseId: academyCertificateCourses.courseId,
      sortOrder: academyCertificateCourses.sortOrder,
      courseSlug: academyCourses.slug,
      courseStatus: academyCourses.status,
    })
    .from(academyCertificateCourses)
    .innerJoin(academyCourses, eq(academyCourses.id, academyCertificateCourses.courseId))
    .where(eq(academyCertificateCourses.certificateId, certificate.id))
    .orderBy(asc(academyCertificateCourses.sortOrder));

  const publishedLinks = links.filter((link) => link.courseStatus === 'published');
  const courseIds = publishedLinks.map((link) => link.courseId);

  const courseTranslations = courseIds.length
    ? await db.select().from(academyCourseTranslations).where(inArray(academyCourseTranslations.courseId, courseIds))
    : [];
  const courseTById = new Map<string, (typeof courseTranslations)[number][]>();
  for (const t of courseTranslations) {
    const bucket = courseTById.get(t.courseId) ?? [];
    bucket.push(t);
    courseTById.set(t.courseId, bucket);
  }

  const unitRows = courseIds.length
    ? await db
        .select()
        .from(academyUnits)
        .where(inArray(academyUnits.courseId, courseIds))
        .orderBy(asc(academyUnits.sortOrder), asc(academyUnits.createdAt))
    : [];
  const unitIds = unitRows.map((unit) => unit.id);
  const unitTranslations = unitIds.length
    ? await db.select().from(academyUnitTranslations).where(inArray(academyUnitTranslations.unitId, unitIds))
    : [];
  const unitTById = new Map<string, (typeof unitTranslations)[number][]>();
  for (const t of unitTranslations) {
    const bucket = unitTById.get(t.unitId) ?? [];
    bucket.push(t);
    unitTById.set(t.unitId, bucket);
  }

  const lessonRows = unitIds.length
    ? await db
        .select()
        .from(academyLessons)
        .where(inArray(academyLessons.unitId, unitIds))
        .orderBy(asc(academyLessons.sortOrder), asc(academyLessons.createdAt))
    : [];
  const lessonIds = lessonRows.map((lesson) => lesson.id);
  const lessonTranslations = lessonIds.length
    ? await db.select().from(academyLessonTranslations).where(inArray(academyLessonTranslations.lessonId, lessonIds))
    : [];
  const lessonTById = new Map<string, (typeof lessonTranslations)[number][]>();
  for (const t of lessonTranslations) {
    const bucket = lessonTById.get(t.lessonId) ?? [];
    bucket.push(t);
    lessonTById.set(t.lessonId, bucket);
  }

  const completedLessonSet = await getCompletedLessonIdsForUser(userId, lessonIds);

  const courses: CertificateLearningState['courses'] = [];
  let courseIndex = 0;
  for (const link of publishedLinks) {
    courseIndex += 1;
    const ct = pickTranslationForDisplay(courseTById.get(link.courseId) ?? [], resolvedLocale);
    const courseTitle = ct?.title?.trim() ?? '';
    if (!courseTitle) continue;

    const courseUnits = unitRows.filter((unit) => unit.courseId === link.courseId);
    const units = courseUnits.map((unit) => {
      const ut = pickTranslationForDisplay(unitTById.get(unit.id) ?? [], resolvedLocale);
      const unitLessons = lessonRows.filter((lesson) => lesson.unitId === unit.id);
      const lessons = unitLessons.map((lesson) => {
          const lt = pickTranslationForDisplay(lessonTById.get(lesson.id) ?? [], resolvedLocale);
          return {
            id: lesson.id,
            title: lt?.title?.trim() ?? '',
            sortOrder: lesson.sortOrder,
            isComplete: completedLessonSet.has(lesson.id),
            durationSeconds: lesson.durationSeconds,
          };
        });
      return {
        id: unit.id,
        title: ut?.title?.trim() ?? '',
        sortOrder: unit.sortOrder,
        isComplete: lessons.length > 0 && lessons.every((lesson) => lesson.isComplete),
        lessons,
      };
    });

    const isComplete = await isCourseCompleteForUser(userId, link.courseId);
    courses.push({
      certificateCourseId: link.id,
      slug: link.courseSlug,
      title: courseTitle,
      sortOrder: link.sortOrder,
      courseIndex,
      isComplete,
      href: `/courses/${link.courseSlug}?certificateCourseId=${encodeURIComponent(link.id)}`,
      learnHref: academyLearnPath(link.courseSlug, link.id),
      units,
    });
  }

  const progressSnapshot = (await syncCertificateProgress(userId, certificate.id))
    ?? (await getCertificateProgress(userId, certificate.id));

  const earned = await getUserCertificateForCertificate(userId, certificate.id);
  const examMeta = await getCertificateExamMeta(certificate.id, resolvedLocale);

  let status: CertificateLearningStatus = 'not_started';
  if (earned?.passed) {
    status = 'exam_passed';
  } else if (
    progressSnapshot
    && progressSnapshot.totalLessonCount > 0
    && progressSnapshot.completedLessonCount === progressSnapshot.totalLessonCount
  ) {
    status = 'courses_complete';
  } else if (progressSnapshot) {
    status = 'learning';
  }

  const [latestProgress] = await db
    .select({
      certificateCourseId: academyCertificateCourseProgress.certificateCourseId,
      courseSlug: academyCourses.slug,
      courseId: academyCourses.id,
      unitId: academyCertificateCourseProgress.unitId,
      lessonId: academyCertificateCourseProgress.lessonId,
      positionSeconds: academyCertificateCourseProgress.positionSeconds,
    })
    .from(academyCertificateCourseProgress)
    .innerJoin(
      academyCertificateCourses,
      eq(academyCertificateCourses.id, academyCertificateCourseProgress.certificateCourseId),
    )
    .innerJoin(academyCourses, eq(academyCourses.id, academyCertificateCourses.courseId))
    .where(
      and(
        eq(academyCertificateCourseProgress.userId, userId),
        eq(academyCertificateCourses.certificateId, certificate.id),
      ),
    )
    .orderBy(desc(academyCertificateCourseProgress.updatedAt))
    .limit(1);

  let continueLearnHref: string | null = null;
  let continueWatch: CertificateLearningState['continueWatch'] = null;
  if (latestProgress) {
    continueLearnHref = academyLearnPath(latestProgress.courseSlug, latestProgress.certificateCourseId);
    if (latestProgress.unitId && latestProgress.lessonId) {
      const unit = unitRows.find((row) => row.id === latestProgress.unitId);
      const lesson = lessonRows.find((row) => row.id === latestProgress.lessonId);
      if (unit && lesson) {
        const unitTitle = pickTranslationForDisplay(unitTById.get(unit.id) ?? [], resolvedLocale)?.title?.trim() ?? '';
        const lessonTitle = pickTranslationForDisplay(lessonTById.get(lesson.id) ?? [], resolvedLocale)?.title?.trim() ?? '';
        if (unitTitle && lessonTitle) {
          continueWatch = {
            unitTitle,
            lessonTitle,
            positionSeconds: Math.max(0, latestProgress.positionSeconds ?? 0),
            durationSeconds: lesson.durationSeconds,
          };
        }
      }
    }
  } else if (courses[0]) {
    continueLearnHref = courses[0].learnHref;
  }

  return {
    status,
    progress: progressSnapshot
      ? {
          completedLessons: progressSnapshot.completedLessonCount,
          totalLessons: progressSnapshot.totalLessonCount,
          progressPercent: progressSnapshot.progressPercent,
        }
      : null,
    exam: examMeta.hasExam
      ? {
          hasExam: true,
          questionCount: examMeta.questionCount,
          passScorePercent: examMeta.passScorePercent,
          examTitle: examMeta.examTitle,
        }
      : { hasExam: false, questionCount: 0, passScorePercent: 0, examTitle: '' },
    examResult: earned?.passed && earned.certificateNumber
      ? {
          passed: true,
          score: earned.score,
          totalScore: earned.totalScore,
          certificateNumber: earned.certificateNumber,
          certificateHref: `/certificates/view/${encodeURIComponent(earned.certificateNumber)}`,
        }
      : null,
    continueLearnHref,
    continueWatch,
    courses,
  };
}

export async function getPublicCertificateExamHint(certificateSlug: string, locale?: string) {
  const [certificate] = await db
    .select({ id: academyCertificates.id })
    .from(academyCertificates)
    .where(and(eq(academyCertificates.slug, certificateSlug), eq(academyCertificates.status, 'published')))
    .limit(1);
  if (!certificate) return null;

  const examMeta = await getCertificateExamMeta(certificate.id, locale);
  if (!examMeta.hasExam) return { hasExam: false as const };

  const totalCourses = await db
    .select({ courseId: academyCertificateCourses.courseId })
    .from(academyCertificateCourses)
    .innerJoin(academyCourses, eq(academyCourses.id, academyCertificateCourses.courseId))
    .where(
      and(
        eq(academyCertificateCourses.certificateId, certificate.id),
        eq(academyCourses.status, 'published'),
      ),
    );

  return {
    hasExam: true as const,
    questionCount: examMeta.questionCount,
    passScorePercent: examMeta.passScorePercent,
    totalCourses: totalCourses.length,
  };
}

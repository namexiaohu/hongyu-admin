import 'server-only';

import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm';

import {
  ACADEMY_CERTIFICATE_ISSUER,
  generateAcademyCertificateNumber,
} from '@/lib/academy-certificate-number';
import { resolveStorefrontCoverUrl } from '@/lib/cover-presets';
import { resolveOssAssetUrl } from '@/lib/oss-asset-url';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { db } from '@/server/db';
import {
  academyCourseTranslations,
  academyCourses,
  academyExamAttempts,
  academyQuestionBankTranslations,
  academyUserCertificates,
  users,
} from '@/server/db/schema';
import { getCertificateCourseMetaByIds } from '@/server/storefront/academy-certificate-courses';

function resolveCover(row: { coverMode: string; coverValue: string; coverImage: string }) {
  return resolveStorefrontCoverUrl({
    mode: row.coverMode,
    value: row.coverValue,
    legacyCoverImageKey: row.coverImage,
    toPublicUrl: resolveOssAssetUrl,
  });
}

function recipientDisplayName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim() || firstName || lastName;
}

async function getCourseTitle(courseId: string, locale: string) {
  const translations = await db
    .select()
    .from(academyCourseTranslations)
    .where(eq(academyCourseTranslations.courseId, courseId));
  const display = pickTranslationForDisplay(translations, locale);
  return display?.title?.trim() ?? '';
}

/** Idempotent: one certificate per passed attempt. */
export async function issueUserCertificateForAttempt(attemptId: string, locale?: string) {
  const [attempt] = await db
    .select()
    .from(academyExamAttempts)
    .where(eq(academyExamAttempts.id, attemptId))
    .limit(1);

  if (!attempt?.submittedAt || !attempt.passed) return null;

  const [existing] = await db
    .select({
      id: academyUserCertificates.id,
      certificateNumber: academyUserCertificates.certificateNumber,
    })
    .from(academyUserCertificates)
    .where(eq(academyUserCertificates.attemptId, attemptId))
    .limit(1);
  if (existing) return existing;

  const defaultLocale = locale ?? (await getDefaultSiteLanguageCode());
  const [user] = await db
    .select({ firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.id, attempt.userId))
    .limit(1);
  if (!user) return null;

  const title = await getCourseTitle(attempt.courseId, defaultLocale);
  const recipientName = recipientDisplayName(user.firstName, user.lastName);
  const issuedAt = new Date();

  for (let i = 0; i < 5; i += 1) {
    const certificateNumber = generateAcademyCertificateNumber(issuedAt);
    try {
      const [created] = await db
        .insert(academyUserCertificates)
        .values({
          userId: attempt.userId,
          courseId: attempt.courseId,
          certificateCourseId: attempt.certificateCourseId,
          attemptId: attempt.id,
          certificateNumber,
          recipientName,
          title,
          issuerName: ACADEMY_CERTIFICATE_ISSUER,
          issuedAt,
        })
        .returning({
          id: academyUserCertificates.id,
          certificateNumber: academyUserCertificates.certificateNumber,
        });
      return created;
    } catch {
      // Unique collision on certificate_number — retry
    }
  }

  return null;
}

export async function getCertificateNumberForAttempt(attemptId: string) {
  const [row] = await db
    .select({ certificateNumber: academyUserCertificates.certificateNumber })
    .from(academyUserCertificates)
    .where(eq(academyUserCertificates.attemptId, attemptId))
    .limit(1);
  return row?.certificateNumber ?? null;
}

/** Latest certificate the user earned for a certificate-course link, if any. */
export async function getUserCertificateForCertificateCourse(userId: string, certificateCourseId: string) {
  const [row] = await db
    .select({
      certificateNumber: academyUserCertificates.certificateNumber,
      issuedAt: academyUserCertificates.issuedAt,
    })
    .from(academyUserCertificates)
    .where(
      and(
        eq(academyUserCertificates.userId, userId),
        eq(academyUserCertificates.certificateCourseId, certificateCourseId),
      ),
    )
    .orderBy(desc(academyUserCertificates.issuedAt))
    .limit(1);

  if (!row) return null;
  return {
    certificateNumber: row.certificateNumber,
    issuedAt: row.issuedAt.toISOString(),
  };
}

export async function listMyExamRecords(userId: string, locale?: string) {
  const defaultLocale = locale ?? (await getDefaultSiteLanguageCode());

  const rows = await db
    .select({
      attemptId: academyExamAttempts.id,
      courseId: academyExamAttempts.courseId,
      certificateCourseId: academyExamAttempts.certificateCourseId,
      questionBankId: academyExamAttempts.questionBankId,
      score: academyExamAttempts.score,
      totalScore: academyExamAttempts.totalScore,
      passed: academyExamAttempts.passed,
      submittedAt: academyExamAttempts.submittedAt,
      courseSlug: academyCourses.slug,
    })
    .from(academyExamAttempts)
    .innerJoin(academyCourses, eq(academyCourses.id, academyExamAttempts.courseId))
    .where(and(eq(academyExamAttempts.userId, userId), isNotNull(academyExamAttempts.submittedAt)))
    .orderBy(desc(academyExamAttempts.submittedAt));

  if (!rows.length) return { items: [] as const };

  const courseIds = [...new Set(rows.map((row) => row.courseId))];
  const bankIds = [...new Set(rows.map((row) => row.questionBankId))];

  const allCourseTranslations = await db
    .select()
    .from(academyCourseTranslations)
    .where(inArray(academyCourseTranslations.courseId, courseIds));

  const courseTitleById = new Map<string, string>();
  for (const courseId of courseIds) {
    const list = allCourseTranslations.filter((t) => t.courseId === courseId);
    const display = pickTranslationForDisplay(list, defaultLocale);
    courseTitleById.set(courseId, display?.title?.trim() ?? '');
  }

  const allBankTranslations = await db
    .select()
    .from(academyQuestionBankTranslations)
    .where(inArray(academyQuestionBankTranslations.questionBankId, bankIds));
  const examTitleByBankId = new Map<string, string>();
  for (const bankId of bankIds) {
    const list = allBankTranslations.filter((t) => t.questionBankId === bankId);
    const display = pickTranslationForDisplay(list, defaultLocale);
    examTitleByBankId.set(bankId, display?.title?.trim() ?? '');
  }

  const certMeta = await getCertificateCourseMetaByIds(
    rows.map((row) => row.certificateCourseId),
    defaultLocale,
  );

  return {
    items: rows.map((row) => {
      const score = row.score ?? 0;
      const totalScore = row.totalScore ?? 0;
      const meta = certMeta.get(row.certificateCourseId);
      return {
        attemptId: row.attemptId,
        courseSlug: row.courseSlug,
        courseTitle: courseTitleById.get(row.courseId) ?? '',
        examTitle: examTitleByBankId.get(row.questionBankId) ?? '',
        certificateCourseId: row.certificateCourseId,
        certificateTitle: meta?.certificateTitle ?? '',
        certificateSlug: meta?.certificateSlug ?? '',
        score,
        totalScore,
        scorePercent: totalScore > 0 ? Math.round((score / totalScore) * 100) : 0,
        passed: row.passed ?? false,
        submittedAt: row.submittedAt!.toISOString(),
      };
    }),
  };
}

export async function listMyCertificates(userId: string, locale?: string) {
  const defaultLocale = locale ?? (await getDefaultSiteLanguageCode());

  const rows = await db
    .select({
      id: academyUserCertificates.id,
      certificateNumber: academyUserCertificates.certificateNumber,
      title: academyUserCertificates.title,
      issuerName: academyUserCertificates.issuerName,
      recipientName: academyUserCertificates.recipientName,
      issuedAt: academyUserCertificates.issuedAt,
      courseId: academyUserCertificates.courseId,
      courseSlug: academyCourses.slug,
      coverImage: academyCourses.coverImage,
      coverMode: academyCourses.coverMode,
      coverValue: academyCourses.coverValue,
    })
    .from(academyUserCertificates)
    .innerJoin(academyCourses, eq(academyCourses.id, academyUserCertificates.courseId))
    .where(eq(academyUserCertificates.userId, userId))
    .orderBy(desc(academyUserCertificates.issuedAt));

  return {
    items: rows.map((row) => ({
      id: row.id,
      certificateNumber: row.certificateNumber,
      title: row.title,
      issuerName: row.issuerName,
      recipientName: row.recipientName,
      issuedAt: row.issuedAt.toISOString(),
      courseSlug: row.courseSlug,
      coverPreviewUrl: resolveCover(row),
      courseCount: 1,
      locale: defaultLocale,
    })),
  };
}

export async function getPublicCertificateByNumber(certificateNumber: string) {
  const [row] = await db
    .select({
      certificateNumber: academyUserCertificates.certificateNumber,
      title: academyUserCertificates.title,
      issuerName: academyUserCertificates.issuerName,
      recipientName: academyUserCertificates.recipientName,
      issuedAt: academyUserCertificates.issuedAt,
      courseSlug: academyCourses.slug,
    })
    .from(academyUserCertificates)
    .innerJoin(academyCourses, eq(academyCourses.id, academyUserCertificates.courseId))
    .where(eq(academyUserCertificates.certificateNumber, certificateNumber))
    .limit(1);

  if (!row) return null;

  return {
    certificateNumber: row.certificateNumber,
    title: row.title,
    badge: 'Professional Certificate',
    issuerName: row.issuerName,
    recipientName: row.recipientName,
    issuedAt: row.issuedAt.toISOString(),
    courseSlug: row.courseSlug,
  };
}

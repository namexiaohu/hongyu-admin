import 'server-only';

import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm';

import {
  ACADEMY_CERTIFICATE_ISSUER,
  generateAcademyCertificateNumber,
} from '@/lib/academy-certificate-number';
import { resolveStorefrontCoverUrl } from '@/lib/cover-presets';
import { resolveOssAssetUrl } from '@/lib/oss-asset-url';
import { pickTranslationForLocale } from '@/lib/pick-translation-for-display';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { db } from '@/server/db';
import {
  academyCertificates,
  academyCertificateTranslations,
  academyExamAttempts,
  academyQuestionBankTranslations,
  academyUserCertificates,
  users,
} from '@/server/db/schema';

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

async function getCertificateTitle(certificateId: string, locale: string) {
  const fallbackLocale = await getDefaultSiteLanguageCode();
  const translations = await db
    .select()
    .from(academyCertificateTranslations)
    .where(eq(academyCertificateTranslations.certificateId, certificateId));
  const display = pickTranslationForLocale(translations, locale, fallbackLocale);
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

  const [existingByAttempt] = await db
    .select({
      id: academyUserCertificates.id,
      certificateNumber: academyUserCertificates.certificateNumber,
    })
    .from(academyUserCertificates)
    .where(eq(academyUserCertificates.attemptId, attemptId))
    .limit(1);
  if (existingByAttempt) return existingByAttempt;

  const [existingByUserCert] = await db
    .select({
      id: academyUserCertificates.id,
      certificateNumber: academyUserCertificates.certificateNumber,
    })
    .from(academyUserCertificates)
    .where(
      and(
        eq(academyUserCertificates.userId, attempt.userId),
        eq(academyUserCertificates.certificateId, attempt.certificateId),
      ),
    )
    .limit(1);
  if (existingByUserCert) return existingByUserCert;

  const defaultLocale = locale ?? (await getDefaultSiteLanguageCode());
  const [user] = await db
    .select({ firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.id, attempt.userId))
    .limit(1);
  if (!user) return null;

  const title = await getCertificateTitle(attempt.certificateId, defaultLocale);
  const recipientName = recipientDisplayName(user.firstName, user.lastName);
  const issuedAt = new Date();

  for (let i = 0; i < 5; i += 1) {
    const certificateNumber = generateAcademyCertificateNumber(issuedAt);
    try {
      const [created] = await db
        .insert(academyUserCertificates)
        .values({
          userId: attempt.userId,
          certificateId: attempt.certificateId,
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

export async function getUserCertificateForCertificate(userId: string, certificateId: string) {
  const [row] = await db
    .select({
      certificateNumber: academyUserCertificates.certificateNumber,
      issuedAt: academyUserCertificates.issuedAt,
      attemptId: academyUserCertificates.attemptId,
    })
    .from(academyUserCertificates)
    .where(
      and(
        eq(academyUserCertificates.userId, userId),
        eq(academyUserCertificates.certificateId, certificateId),
      ),
    )
    .orderBy(desc(academyUserCertificates.issuedAt))
    .limit(1);

  if (!row) return null;

  const [attempt] = await db
    .select({ score: academyExamAttempts.score, totalScore: academyExamAttempts.totalScore, passed: academyExamAttempts.passed })
    .from(academyExamAttempts)
    .where(eq(academyExamAttempts.id, row.attemptId))
    .limit(1);

  return {
    certificateNumber: row.certificateNumber,
    issuedAt: row.issuedAt.toISOString(),
    score: attempt?.score ?? null,
    totalScore: attempt?.totalScore ?? null,
    passed: attempt?.passed ?? false,
  };
}

export async function listMyExamRecords(userId: string, locale?: string) {
  const defaultLocale = locale ?? (await getDefaultSiteLanguageCode());
  const siteDefaultLocale = await getDefaultSiteLanguageCode();

  const rows = await db
    .select({
      attemptId: academyExamAttempts.id,
      certificateId: academyExamAttempts.certificateId,
      questionBankId: academyExamAttempts.questionBankId,
      score: academyExamAttempts.score,
      totalScore: academyExamAttempts.totalScore,
      passed: academyExamAttempts.passed,
      submittedAt: academyExamAttempts.submittedAt,
      certificateSlug: academyCertificates.slug,
    })
    .from(academyExamAttempts)
    .innerJoin(academyCertificates, eq(academyCertificates.id, academyExamAttempts.certificateId))
    .where(and(eq(academyExamAttempts.userId, userId), isNotNull(academyExamAttempts.submittedAt)))
    .orderBy(desc(academyExamAttempts.submittedAt));

  if (!rows.length) return { items: [] as const };

  const certificateIds = [...new Set(rows.map((row) => row.certificateId))];
  const bankIds = [...new Set(rows.map((row) => row.questionBankId))];

  const allCertTranslations = await db
    .select()
    .from(academyCertificateTranslations)
    .where(inArray(academyCertificateTranslations.certificateId, certificateIds));

  const certTitleById = new Map<string, string>();
  for (const certificateId of certificateIds) {
    const list = allCertTranslations.filter((t) => t.certificateId === certificateId);
    const display = pickTranslationForLocale(list, defaultLocale, siteDefaultLocale);
    certTitleById.set(certificateId, display?.title?.trim() ?? '');
  }

  const allBankTranslations = await db
    .select()
    .from(academyQuestionBankTranslations)
    .where(inArray(academyQuestionBankTranslations.questionBankId, bankIds));
  const examTitleByBankId = new Map<string, string>();
  for (const bankId of bankIds) {
    const list = allBankTranslations.filter((t) => t.questionBankId === bankId);
    const display = pickTranslationForLocale(list, defaultLocale, siteDefaultLocale);
    examTitleByBankId.set(bankId, display?.title?.trim() ?? '');
  }

  return {
    items: rows.flatMap((row) => {
      const certificateTitle = certTitleById.get(row.certificateId) ?? '';
      const examTitle = examTitleByBankId.get(row.questionBankId) ?? '';
      if (!certificateTitle || !examTitle) return [];
      const score = row.score ?? 0;
      const totalScore = row.totalScore ?? 0;
      return [{
        attemptId: row.attemptId,
        certificateSlug: row.certificateSlug,
        certificateTitle,
        examTitle,
        score,
        totalScore,
        scorePercent: totalScore > 0 ? Math.round((score / totalScore) * 100) : 0,
        passed: row.passed ?? false,
        submittedAt: row.submittedAt!.toISOString(),
      }];
    }),
  };
}

export async function listMyCertificates(userId: string, locale?: string) {
  const defaultLocale = locale ?? (await getDefaultSiteLanguageCode());

  const rows = await db
    .select({
      id: academyUserCertificates.id,
      certificateId: academyUserCertificates.certificateId,
      certificateNumber: academyUserCertificates.certificateNumber,
      issuerName: academyUserCertificates.issuerName,
      recipientName: academyUserCertificates.recipientName,
      issuedAt: academyUserCertificates.issuedAt,
      certificateSlug: academyCertificates.slug,
      coverImage: academyCertificates.coverImage,
      coverMode: academyCertificates.coverMode,
      coverValue: academyCertificates.coverValue,
    })
    .from(academyUserCertificates)
    .innerJoin(academyCertificates, eq(academyCertificates.id, academyUserCertificates.certificateId))
    .where(eq(academyUserCertificates.userId, userId))
    .orderBy(desc(academyUserCertificates.issuedAt));

  const items = await Promise.all(rows.map(async (row) => {
    const title = await getCertificateTitle(row.certificateId, defaultLocale);
    if (!title) return null;
    return {
      id: row.id,
      certificateNumber: row.certificateNumber,
      title,
      issuerName: row.issuerName,
      recipientName: row.recipientName,
      issuedAt: row.issuedAt.toISOString(),
      certificateSlug: row.certificateSlug,
      coverPreviewUrl: resolveCover(row),
      locale: defaultLocale,
    };
  }));

  return {
    items: items.filter((item): item is NonNullable<typeof item> => Boolean(item)),
  };
}

export async function getPublicCertificateByNumber(certificateNumber: string, locale?: string) {
  const resolvedLocale = locale?.trim() || await getDefaultSiteLanguageCode();
  const [row] = await db
    .select({
      certificateNumber: academyUserCertificates.certificateNumber,
      certificateId: academyUserCertificates.certificateId,
      issuerName: academyUserCertificates.issuerName,
      recipientName: academyUserCertificates.recipientName,
      issuedAt: academyUserCertificates.issuedAt,
      certificateSlug: academyCertificates.slug,
    })
    .from(academyUserCertificates)
    .innerJoin(academyCertificates, eq(academyCertificates.id, academyUserCertificates.certificateId))
    .where(eq(academyUserCertificates.certificateNumber, certificateNumber))
    .limit(1);

  if (!row) return null;

  const title = await getCertificateTitle(row.certificateId, resolvedLocale);
  if (!title) return null;

  const company = await import('@/server/storefront/company-profile').then((m) => m.getStorefrontCompanyProfile(resolvedLocale));

  return {
    certificateNumber: row.certificateNumber,
    title,
    issuerName: company.companyName.trim() || row.issuerName,
    recipientName: row.recipientName,
    issuedAt: row.issuedAt.toISOString(),
    certificateSlug: row.certificateSlug,
    locale: resolvedLocale,
  };
}

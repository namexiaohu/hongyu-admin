import 'server-only';

import { and, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';

import type { AdminExamRecordListItem } from '@/lib/academy-exam-records';
import type { AcademyQuestionContent, AcademyQuestionType } from '@/lib/academy-question-content';
import { gradeQuestion } from '@/lib/academy-question-content';
import { resolveOssAssetUrl } from '@/lib/oss-asset-url';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { db } from '@/server/db';
import {
  academyCertificateTranslations,
  academyCertificates,
  academyExamAttempts,
  academyQuestionBankTranslations,
  academyQuestions,
  academyQuestionTranslations,
  academyUserCertificates,
  users,
} from '@/server/db/schema';

export type { AdminExamRecordListItem };

function recipientDisplayName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim() || firstName || lastName;
}

function extractQuestionPrompt(content: AcademyQuestionContent): string {
  if ('prompt' in content && typeof content.prompt === 'string') return content.prompt;
  if ('promptBefore' in content && typeof content.promptBefore === 'string') {
    const after = 'promptAfter' in content && typeof content.promptAfter === 'string' ? content.promptAfter : '';
    return `${content.promptBefore}${after ? ` ___ ${after}` : ''}`;
  }
  return '';
}

export async function getAdminExamRecordList(filters?: {
  keyword?: string;
  passed?: 'true' | 'false' | '';
  mailStatus?: 'unsent' | 'sent' | '';
}) {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const conditions: SQL[] = [sql`${academyExamAttempts.submittedAt} is not null`];

  if (filters?.passed === 'true') conditions.push(eq(academyExamAttempts.passed, true));
  if (filters?.passed === 'false') conditions.push(eq(academyExamAttempts.passed, false));
  if (filters?.mailStatus === 'unsent' || filters?.mailStatus === 'sent') {
    conditions.push(eq(academyExamAttempts.certificateMailStatus, filters.mailStatus));
  }

  const keyword = filters?.keyword?.trim();
  if (keyword) {
    const like = `%${keyword}%`;
    conditions.push(
      or(
        ilike(users.email, like),
        ilike(users.firstName, like),
        ilike(users.lastName, like),
        sql`concat(${users.firstName}, ' ', ${users.lastName}) ilike ${like}`,
      )!,
    );
  }

  const rows = await db
    .select({
      id: academyExamAttempts.id,
      userId: academyExamAttempts.userId,
      certificateId: academyExamAttempts.certificateId,
      score: academyExamAttempts.score,
      totalScore: academyExamAttempts.totalScore,
      passed: academyExamAttempts.passed,
      submittedAt: academyExamAttempts.submittedAt,
      certificateMailStatus: academyExamAttempts.certificateMailStatus,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    })
    .from(academyExamAttempts)
    .innerJoin(users, eq(users.id, academyExamAttempts.userId))
    .where(and(...conditions))
    .orderBy(desc(academyExamAttempts.submittedAt));

  if (!rows.length) return { items: [] as AdminExamRecordListItem[], total: 0 };

  const certificateIds = [...new Set(rows.map((r) => r.certificateId))];
  const attemptIds = rows.map((r) => r.id);

  const certTranslations = await db
    .select()
    .from(academyCertificateTranslations)
    .where(inArray(academyCertificateTranslations.certificateId, certificateIds));
  const titleByCertificate = new Map<string, string>();
  for (const certificateId of certificateIds) {
    const list = certTranslations.filter((t) => t.certificateId === certificateId);
    titleByCertificate.set(certificateId, pickTranslationForDisplay(list, defaultLocale)?.title?.trim() ?? '');
  }

  const certRows = await db
    .select({ attemptId: academyUserCertificates.attemptId })
    .from(academyUserCertificates)
    .where(inArray(academyUserCertificates.attemptId, attemptIds));
  const certAttemptIds = new Set(certRows.map((r) => r.attemptId));

  const items: AdminExamRecordListItem[] = rows.map((row) => {
    const score = row.score ?? 0;
    const totalScore = row.totalScore ?? 0;
    return {
      id: row.id,
      userId: row.userId,
      userName: recipientDisplayName(row.firstName, row.lastName),
      userEmail: row.email,
      courseId: row.certificateId,
      courseTitle: titleByCertificate.get(row.certificateId) ?? '',
      certificateTitle: titleByCertificate.get(row.certificateId) ?? '',
      score,
      totalScore,
      scorePercent: totalScore > 0 ? Math.round((score / totalScore) * 100) : 0,
      passed: row.passed ?? false,
      submittedAt: row.submittedAt!.toISOString(),
      certificateMailStatus: row.certificateMailStatus === 'sent' ? 'sent' : 'unsent',
      hasCertificate: certAttemptIds.has(row.id),
    };
  });

  return { items, total: items.length };
}

export async function getAdminExamRecordDetail(attemptId: string) {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const [row] = await db
    .select({
      id: academyExamAttempts.id,
      userId: academyExamAttempts.userId,
      certificateId: academyExamAttempts.certificateId,
      questionBankId: academyExamAttempts.questionBankId,
      score: academyExamAttempts.score,
      totalScore: academyExamAttempts.totalScore,
      passed: academyExamAttempts.passed,
      submittedAt: academyExamAttempts.submittedAt,
      startedAt: academyExamAttempts.startedAt,
      answers: academyExamAttempts.answers,
      certificateMailStatus: academyExamAttempts.certificateMailStatus,
      certificateMailFile: academyExamAttempts.certificateMailFile,
      certificateMailUpdatedAt: academyExamAttempts.certificateMailUpdatedAt,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      certificateSlug: academyCertificates.slug,
    })
    .from(academyExamAttempts)
    .innerJoin(users, eq(users.id, academyExamAttempts.userId))
    .innerJoin(academyCertificates, eq(academyCertificates.id, academyExamAttempts.certificateId))
    .where(eq(academyExamAttempts.id, attemptId))
    .limit(1);

  if (!row?.submittedAt) return null;

  const certTranslations = await db
    .select()
    .from(academyCertificateTranslations)
    .where(eq(academyCertificateTranslations.certificateId, row.certificateId));
  const certTitle = pickTranslationForDisplay(certTranslations, defaultLocale)?.title?.trim() ?? '';

  const bankTranslations = await db
    .select()
    .from(academyQuestionBankTranslations)
    .where(eq(academyQuestionBankTranslations.questionBankId, row.questionBankId));
  const examTitle = pickTranslationForDisplay(bankTranslations, defaultLocale)?.title?.trim() ?? '';

  const questions = await db
    .select()
    .from(academyQuestions)
    .where(eq(academyQuestions.questionBankId, row.questionBankId))
    .orderBy(academyQuestions.sortOrder);

  const questionIds = questions.map((q) => q.id);
  const questionTranslations = questionIds.length
    ? await db
        .select()
        .from(academyQuestionTranslations)
        .where(inArray(academyQuestionTranslations.questionId, questionIds))
    : [];

  const answers = row.answers ?? {};
  const review = questions.map((question, index) => {
    const list = questionTranslations.filter((t) => t.questionId === question.id);
    const display = pickTranslationForDisplay(list, defaultLocale);
    const content = (display?.content ?? { prompt: '' }) as AcademyQuestionContent;
    const type = question.questionType as AcademyQuestionType;
    const userAnswer = answers[question.id];
    const isCorrect = gradeQuestion(type, content, userAnswer);
    return {
      id: question.id,
      index: index + 1,
      questionType: type,
      score: question.score,
      prompt: extractQuestionPrompt(content),
      userAnswer: userAnswer ?? null,
      isCorrect,
    };
  });

  const [userCert] = await db
    .select({
      certificateNumber: academyUserCertificates.certificateNumber,
      issuedAt: academyUserCertificates.issuedAt,
    })
    .from(academyUserCertificates)
    .where(eq(academyUserCertificates.attemptId, row.id))
    .limit(1);

  const mailFileKey = row.certificateMailFile?.trim() || null;

  return {
    id: row.id,
    user: {
      id: row.userId,
      name: recipientDisplayName(row.firstName, row.lastName),
      email: row.email,
    },
    courseTitle: certTitle,
    certificateTitle: certTitle,
    examTitle,
    score: row.score ?? 0,
    totalScore: row.totalScore ?? 0,
    scorePercent: row.totalScore ? Math.round(((row.score ?? 0) / row.totalScore) * 100) : 0,
    passed: row.passed ?? false,
    submittedAt: row.submittedAt.toISOString(),
    startedAt: row.startedAt.toISOString(),
    certificateMailStatus: row.certificateMailStatus === 'sent' ? 'sent' as const : 'unsent' as const,
    certificateMailFile: mailFileKey,
    certificateMailFileUrl: mailFileKey ? resolveOssAssetUrl(mailFileKey) : null,
    certificateMailUpdatedAt: row.certificateMailUpdatedAt?.toISOString() ?? null,
    certificateNumber: userCert?.certificateNumber ?? null,
    certificateIssuedAt: userCert?.issuedAt?.toISOString() ?? null,
    review,
  };
}

export async function updateAdminExamRecordMail(
  attemptId: string,
  input: { certificateMailStatus?: 'unsent' | 'sent'; certificateMailFile?: string | null },
) {
  const [existing] = await db
    .select({ id: academyExamAttempts.id })
    .from(academyExamAttempts)
    .where(eq(academyExamAttempts.id, attemptId))
    .limit(1);
  if (!existing) return null;

  await db
    .update(academyExamAttempts)
    .set({
      ...(input.certificateMailStatus ? { certificateMailStatus: input.certificateMailStatus } : {}),
      ...(input.certificateMailFile !== undefined ? { certificateMailFile: input.certificateMailFile } : {}),
      certificateMailUpdatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(academyExamAttempts.id, attemptId));

  return getAdminExamRecordDetail(attemptId);
}

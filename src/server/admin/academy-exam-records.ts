import 'server-only';

import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';

import type { AdminExamRecordListItem } from '@/lib/academy-exam-records';
import type { AcademyQuestionContent, AcademyQuestionType } from '@/lib/academy-question-content';
import { gradeQuestion } from '@/lib/academy-question-content';
import { resolveOssAssetUrl } from '@/lib/oss-asset-url';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { db } from '@/server/db';
import {
  academyCourseTranslations,
  academyCourses,
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
      courseId: academyExamAttempts.courseId,
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

  const courseIds = [...new Set(rows.map((r) => r.courseId))];
  const attemptIds = rows.map((r) => r.id);

  const courseTranslations = await db
    .select()
    .from(academyCourseTranslations)
    .where(inArray(academyCourseTranslations.courseId, courseIds));
  const titleByCourse = new Map<string, string>();
  for (const courseId of courseIds) {
    const list = courseTranslations.filter((t) => t.courseId === courseId);
    titleByCourse.set(courseId, pickTranslationForDisplay(list, defaultLocale)?.title?.trim() ?? '');
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
      courseId: row.courseId,
      courseTitle: titleByCourse.get(row.courseId) ?? '',
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
      courseId: academyExamAttempts.courseId,
      questionBankId: academyExamAttempts.questionBankId,
      score: academyExamAttempts.score,
      totalScore: academyExamAttempts.totalScore,
      passed: academyExamAttempts.passed,
      answers: academyExamAttempts.answers,
      startedAt: academyExamAttempts.startedAt,
      submittedAt: academyExamAttempts.submittedAt,
      certificateMailStatus: academyExamAttempts.certificateMailStatus,
      certificateMailFile: academyExamAttempts.certificateMailFile,
      certificateMailUpdatedAt: academyExamAttempts.certificateMailUpdatedAt,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      courseSlug: academyCourses.slug,
    })
    .from(academyExamAttempts)
    .innerJoin(users, eq(users.id, academyExamAttempts.userId))
    .innerJoin(academyCourses, eq(academyCourses.id, academyExamAttempts.courseId))
    .where(eq(academyExamAttempts.id, attemptId))
    .limit(1);

  if (!row || !row.submittedAt) return null;

  const courseTranslations = await db
    .select()
    .from(academyCourseTranslations)
    .where(eq(academyCourseTranslations.courseId, row.courseId));
  const courseTitle = pickTranslationForDisplay(courseTranslations, defaultLocale)?.title?.trim() ?? '';

  const bankTranslations = await db
    .select()
    .from(academyQuestionBankTranslations)
    .where(eq(academyQuestionBankTranslations.questionBankId, row.questionBankId));
  const examTitle = pickTranslationForDisplay(bankTranslations, defaultLocale)?.title?.trim() ?? '';

  const [cert] = await db
    .select({
      certificateNumber: academyUserCertificates.certificateNumber,
      issuedAt: academyUserCertificates.issuedAt,
    })
    .from(academyUserCertificates)
    .where(eq(academyUserCertificates.attemptId, attemptId))
    .limit(1);

  const questions = await db
    .select()
    .from(academyQuestions)
    .where(eq(academyQuestions.questionBankId, row.questionBankId))
    .orderBy(asc(academyQuestions.sortOrder), asc(academyQuestions.createdAt));

  const questionIds = questions.map((q) => q.id);
  const translations = questionIds.length
    ? await db
        .select()
        .from(academyQuestionTranslations)
        .where(inArray(academyQuestionTranslations.questionId, questionIds))
    : [];

  const answers = row.answers ?? {};
  const review = questions.map((question, index) => {
    const list = translations.filter((t) => t.questionId === question.id);
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
      prompt:
        type === 'fill_blank'
          ? `${(content as { promptBefore?: string }).promptBefore ?? ''} ___ ${(content as { promptAfter?: string }).promptAfter ?? ''}`
          : ((content as { prompt?: string }).prompt ?? ''),
      userAnswer: userAnswer ?? null,
      isCorrect,
    };
  });

  const score = row.score ?? 0;
  const totalScore = row.totalScore ?? 0;
  const mailFile = row.certificateMailFile?.trim() || null;

  return {
    id: row.id,
    user: {
      id: row.userId,
      name: recipientDisplayName(row.firstName, row.lastName),
      email: row.email,
    },
    courseId: row.courseId,
    courseSlug: row.courseSlug,
    courseTitle,
    examTitle,
    score,
    totalScore,
    scorePercent: totalScore > 0 ? Math.round((score / totalScore) * 100) : 0,
    passed: row.passed ?? false,
    startedAt: row.startedAt.toISOString(),
    submittedAt: row.submittedAt.toISOString(),
    certificateMailStatus: (row.certificateMailStatus === 'sent' ? 'sent' : 'unsent') as 'unsent' | 'sent',
    certificateMailFile: mailFile,
    certificateMailFileUrl: mailFile ? resolveOssAssetUrl(mailFile) || mailFile : null,
    certificateMailUpdatedAt: row.certificateMailUpdatedAt?.toISOString() ?? null,
    certificateNumber: cert?.certificateNumber ?? null,
    certificateIssuedAt: cert?.issuedAt?.toISOString() ?? null,
    review,
  };
}

export async function updateAdminExamRecordMail(
  attemptId: string,
  patch: { certificateMailStatus?: 'unsent' | 'sent'; certificateMailFile?: string | null },
) {
  const [existing] = await db
    .select({ id: academyExamAttempts.id })
    .from(academyExamAttempts)
    .where(eq(academyExamAttempts.id, attemptId))
    .limit(1);
  if (!existing) return null;

  const updates: Partial<typeof academyExamAttempts.$inferInsert> = {
    updatedAt: new Date(),
    certificateMailUpdatedAt: new Date(),
  };
  if (patch.certificateMailStatus) {
    updates.certificateMailStatus = patch.certificateMailStatus;
  }
  if (patch.certificateMailFile !== undefined) {
    updates.certificateMailFile = patch.certificateMailFile;
  }

  await db.update(academyExamAttempts).set(updates).where(eq(academyExamAttempts.id, attemptId));
  return getAdminExamRecordDetail(attemptId);
}

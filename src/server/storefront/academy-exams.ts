import 'server-only';

import { and, asc, eq, inArray, isNotNull, sql } from 'drizzle-orm';

import type { AcademyQuestionType, ExamUserAnswer } from '@/lib/academy-question-content';
import {
  gradeQuestion,
  stripCorrectAnswers,
  type AcademyQuestionContent,
} from '@/lib/academy-question-content';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { listCompletedLessonIdsForCourse } from '@/server/storefront/academy-progress';
import {
  getCertificateNumberForAttempt,
  getUserCertificateForCourse,
  issueUserCertificateForAttempt,
} from '@/server/storefront/academy-user-certificates';
import { db } from '@/server/db';
import {
  academyCourseQuestionBanks,
  academyCourses,
  academyExamAttempts,
  academyLessons,
  academyQuestionBankTranslations,
  academyQuestionBanks,
  academyQuestions,
  academyQuestionTranslations,
  academyUnits,
} from '@/server/db/schema';

async function getCourseBySlug(slug: string) {
  const [course] = await db
    .select({ id: academyCourses.id, slug: academyCourses.slug })
    .from(academyCourses)
    .where(eq(academyCourses.slug, slug))
    .limit(1);
  return course ?? null;
}

async function getAllLessonIdsForCourse(courseId: string) {
  const unitRows = await db
    .select({ id: academyUnits.id })
    .from(academyUnits)
    .where(eq(academyUnits.courseId, courseId));
  const unitIds = unitRows.map((row) => row.id);
  if (!unitIds.length) return [];

  const lessonRows = await db
    .select({ id: academyLessons.id })
    .from(academyLessons)
    .where(inArray(academyLessons.unitId, unitIds));
  return lessonRows.map((row) => row.id);
}

async function isCourseComplete(userId: string, courseSlug: string) {
  const { courseId, lessonIds } = await listCompletedLessonIdsForCourse(userId, courseSlug);
  if (!courseId) return { complete: false, courseId: null as string | null };
  const allLessonIds = await getAllLessonIdsForCourse(courseId);
  if (!allLessonIds.length) return { complete: false, courseId };
  const completed = new Set(lessonIds);
  return { complete: allLessonIds.every((id) => completed.has(id)), courseId };
}

async function countSubmittedAttempts(userId: string, courseId: string) {
  const [{ count = 0 } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(academyExamAttempts)
    .where(
      and(
        eq(academyExamAttempts.userId, userId),
        eq(academyExamAttempts.courseId, courseId),
        isNotNull(academyExamAttempts.submittedAt),
      ),
    );
  return count;
}

async function getLinkedBanks(courseId: string) {
  return db
    .select({
      questionBankId: academyCourseQuestionBanks.questionBankId,
      sortOrder: academyCourseQuestionBanks.sortOrder,
    })
    .from(academyCourseQuestionBanks)
    .where(eq(academyCourseQuestionBanks.courseId, courseId))
    .orderBy(asc(academyCourseQuestionBanks.sortOrder));
}

export async function getExamEligibility(userId: string, courseSlug: string, locale?: string) {
  const course = await getCourseBySlug(courseSlug);
  if (!course) return { ok: false as const, code: 'NOT_FOUND' as const };

  const { complete, courseId } = await isCourseComplete(userId, courseSlug);
  const banks = courseId ? await getLinkedBanks(courseId) : [];

  const submittedCount = courseId ? await countSubmittedAttempts(userId, courseId) : 0;

  let remainingRetakes: number | null = null;
  let canRetake = banks.length > 0;
  if (banks.length) {
    const [bankRow] = await db
      .select({ maxRetakes: academyQuestionBanks.maxRetakes })
      .from(academyQuestionBanks)
      .where(eq(academyQuestionBanks.id, banks[0]!.questionBankId))
      .limit(1);
    if (bankRow?.maxRetakes != null) {
      remainingRetakes = Math.max(0, bankRow.maxRetakes - submittedCount);
      canRetake = remainingRetakes > 0;
    }
  }

  const defaultLocale = locale ?? (await getDefaultSiteLanguageCode());
  let examTitle = '';
  if (banks.length) {
    const translations = await db
      .select()
      .from(academyQuestionBankTranslations)
      .where(eq(academyQuestionBankTranslations.questionBankId, banks[0]!.questionBankId));
    const display = pickTranslationForDisplay(translations, defaultLocale);
    examTitle = display?.title?.trim() ?? '';
  }

  const certificate = await getUserCertificateForCourse(userId, course.id);
  const hasCertificate = Boolean(certificate?.certificateNumber);

  return {
    ok: true as const,
    courseSlug,
    courseId: course.id,
    isCourseComplete: complete,
    hasQuestionBanks: banks.length > 0,
    submittedAttempts: submittedCount,
    remainingRetakes,
    canStartExam: !hasCertificate && complete && banks.length > 0 && canRetake,
    examTitle,
    certificateNumber: certificate?.certificateNumber ?? null,
  };
}

async function loadQuestionsForBank(questionBankId: string, locale: string, includeAnswers: boolean) {
  const rows = await db
    .select()
    .from(academyQuestions)
    .where(eq(academyQuestions.questionBankId, questionBankId))
    .orderBy(asc(academyQuestions.sortOrder), asc(academyQuestions.createdAt));

  if (!rows.length) return [];

  const questionIds = rows.map((row) => row.id);
  const translations = await db
    .select()
    .from(academyQuestionTranslations)
    .where(inArray(academyQuestionTranslations.questionId, questionIds));

  const tByQuestion = new Map<string, typeof translations>();
  for (const t of translations) {
    const bucket = tByQuestion.get(t.questionId) ?? [];
    bucket.push(t);
    tByQuestion.set(t.questionId, bucket);
  }

  return rows.map((row, index) => {
    const list = tByQuestion.get(row.id) ?? [];
    const display = pickTranslationForDisplay(list, locale);
    const content = (display?.content ?? { prompt: '' }) as AcademyQuestionContent;
    const type = row.questionType as AcademyQuestionType;
    return {
      id: row.id,
      index: index + 1,
      questionType: type,
      score: row.score,
      content: includeAnswers ? content : stripCorrectAnswers(type, content),
    };
  });
}

export async function startExamAttempt(userId: string, courseSlug: string, locale?: string) {
  const eligibility = await getExamEligibility(userId, courseSlug, locale);
  if (!eligibility.ok) return eligibility;
  if (!eligibility.isCourseComplete) return { ok: false as const, code: 'COURSE_INCOMPLETE' as const };
  if (!eligibility.hasQuestionBanks) return { ok: false as const, code: 'NO_EXAM' as const };
  if (!eligibility.canStartExam) return { ok: false as const, code: 'RETAKE_LIMIT' as const };

  const banks = await getLinkedBanks(eligibility.courseId);
  const picked = banks[Math.floor(Math.random() * banks.length)]!;
  const defaultLocale = locale ?? (await getDefaultSiteLanguageCode());

  const [bank] = await db
    .select()
    .from(academyQuestionBanks)
    .where(eq(academyQuestionBanks.id, picked.questionBankId))
    .limit(1);
  if (!bank) return { ok: false as const, code: 'NO_EXAM' as const };

  const questions = await loadQuestionsForBank(picked.questionBankId, defaultLocale, false);
  if (!questions.length) return { ok: false as const, code: 'NO_QUESTIONS' as const };

  const translations = await db
    .select()
    .from(academyQuestionBankTranslations)
    .where(eq(academyQuestionBankTranslations.questionBankId, picked.questionBankId));
  const display = pickTranslationForDisplay(translations, defaultLocale);

  const [attempt] = await db
    .insert(academyExamAttempts)
    .values({
      userId,
      courseId: eligibility.courseId,
      questionBankId: picked.questionBankId,
      startedAt: new Date(),
    })
    .returning();

  const totalScore = questions.reduce((sum, q) => sum + q.score, 0);

  return {
    ok: true as const,
    attemptId: attempt.id,
    courseSlug,
    questionBankId: picked.questionBankId,
    title: display?.title?.trim() || 'Exam',
    passScorePercent: bank.passScorePercent,
    timeLimitMinutes: bank.timeLimitMinutes,
    totalScore,
    questions,
    startedAt: attempt.startedAt.toISOString(),
  };
}

export async function submitExamAttempt(
  userId: string,
  attemptId: string,
  answers: Record<string, ExamUserAnswer>,
  locale?: string,
) {
  const [attempt] = await db
    .select()
    .from(academyExamAttempts)
    .where(and(eq(academyExamAttempts.id, attemptId), eq(academyExamAttempts.userId, userId)))
    .limit(1);

  if (!attempt) return { ok: false as const, code: 'NOT_FOUND' as const };
  if (attempt.submittedAt) return { ok: false as const, code: 'ALREADY_SUBMITTED' as const };

  const [bank] = await db
    .select()
    .from(academyQuestionBanks)
    .where(eq(academyQuestionBanks.id, attempt.questionBankId))
    .limit(1);
  if (!bank) return { ok: false as const, code: 'NOT_FOUND' as const };

  if (bank.timeLimitMinutes != null) {
    const deadline = attempt.startedAt.getTime() + bank.timeLimitMinutes * 60 * 1000;
    if (Date.now() > deadline) {
      return { ok: false as const, code: 'TIME_EXPIRED' as const };
    }
  }

  const defaultLocale = locale ?? (await getDefaultSiteLanguageCode());
  const questions = await loadQuestionsForBank(attempt.questionBankId, defaultLocale, true);
  if (!questions.length) return { ok: false as const, code: 'NO_QUESTIONS' as const };

  let score = 0;
  const totalScore = questions.reduce((sum, q) => sum + q.score, 0);
  for (const question of questions) {
    const userAnswer = answers[question.id];
    const fullContent = question.content as AcademyQuestionContent;
    if (gradeQuestion(question.questionType, fullContent, userAnswer)) {
      score += question.score;
    }
  }

  const percent = totalScore > 0 ? (score / totalScore) * 100 : 0;
  const passed = percent >= bank.passScorePercent;

  await db
    .update(academyExamAttempts)
    .set({
      submittedAt: new Date(),
      score,
      totalScore,
      passed,
      answers,
      updatedAt: new Date(),
    })
    .where(eq(academyExamAttempts.id, attemptId));

  let certificateNumber: string | null = null;
  if (passed) {
    const issued = await issueUserCertificateForAttempt(attemptId, defaultLocale);
    certificateNumber = issued?.certificateNumber ?? null;
  }

  return {
    ok: true as const,
    attemptId,
    score,
    totalScore,
    scorePercent: Math.round(percent),
    passed,
    passScorePercent: bank.passScorePercent,
    correctCount: questions.filter((q) => gradeQuestion(q.questionType, q.content as AcademyQuestionContent, answers[q.id])).length,
    totalQuestions: questions.length,
    certificateNumber,
  };
}

export async function getExamAttemptResult(userId: string, attemptId: string, locale?: string) {
  const [attempt] = await db
    .select()
    .from(academyExamAttempts)
    .where(and(eq(academyExamAttempts.id, attemptId), eq(academyExamAttempts.userId, userId)))
    .limit(1);

  if (!attempt || !attempt.submittedAt) return { ok: false as const, code: 'NOT_FOUND' as const };

  const [course] = await db
    .select({ slug: academyCourses.slug })
    .from(academyCourses)
    .where(eq(academyCourses.id, attempt.courseId))
    .limit(1);
  if (!course) return { ok: false as const, code: 'NOT_FOUND' as const };

  const [bank] = await db
    .select()
    .from(academyQuestionBanks)
    .where(eq(academyQuestionBanks.id, attempt.questionBankId))
    .limit(1);
  if (!bank) return { ok: false as const, code: 'NOT_FOUND' as const };

  const defaultLocale = locale ?? (await getDefaultSiteLanguageCode());
  const questions = await loadQuestionsForBank(attempt.questionBankId, defaultLocale, true);
  const translations = await db
    .select()
    .from(academyQuestionBankTranslations)
    .where(eq(academyQuestionBankTranslations.questionBankId, attempt.questionBankId));
  const display = pickTranslationForDisplay(translations, defaultLocale);

  const answers = attempt.answers ?? {};
  const review = questions.map((question) => {
    const fullContent = question.content as AcademyQuestionContent;
    const userAnswer = answers[question.id];
    const isCorrect = gradeQuestion(question.questionType, fullContent, userAnswer);
    return {
      id: question.id,
      index: question.index,
      questionType: question.questionType,
      score: question.score,
      content: fullContent,
      userAnswer: userAnswer ?? null,
      isCorrect,
      earnedScore: isCorrect ? question.score : 0,
    };
  });

  const eligibility = await getExamEligibility(userId, course.slug, defaultLocale);
  const certificateNumber = attempt.passed
    ? await getCertificateNumberForAttempt(attempt.id)
    : null;
  const durationSeconds = Math.max(
    0,
    Math.round((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 1000),
  );

  return {
    ok: true as const,
    attemptId: attempt.id,
    courseSlug: course.slug,
    title: display?.title?.trim() || 'Exam',
    score: attempt.score ?? 0,
    totalScore: attempt.totalScore ?? 0,
    scorePercent: attempt.totalScore ? Math.round(((attempt.score ?? 0) / attempt.totalScore) * 100) : 0,
    passed: attempt.passed ?? false,
    passScorePercent: bank.passScorePercent,
    correctCount: review.filter((item) => item.isCorrect).length,
    totalQuestions: review.length,
    submittedAt: attempt.submittedAt.toISOString(),
    durationSeconds,
    canRetake: eligibility.canStartExam,
    remainingRetakes: eligibility.remainingRetakes,
    certificateNumber,
    review,
  };
}

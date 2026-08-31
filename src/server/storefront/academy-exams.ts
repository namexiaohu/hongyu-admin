import 'server-only';

import { and, asc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';

import type { AcademyQuestionType, ExamUserAnswer } from '@/lib/academy-question-content';
import {
  gradeQuestion,
  stripCorrectAnswers,
  type AcademyQuestionContent,
} from '@/lib/academy-question-content';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { isCertificateLearningComplete } from '@/server/storefront/academy-course-completion';
import {
  getCertificateNumberForAttempt,
  getUserCertificateForCertificate,
  issueUserCertificateForAttempt,
} from '@/server/storefront/academy-user-certificates';
import { db } from '@/server/db';
import {
  academyCertificateQuestionBanks,
  academyCertificates,
  academyCertificateTranslations,
  academyExamAttempts,
  academyQuestionBankTranslations,
  academyQuestionBanks,
  academyQuestions,
  academyQuestionTranslations,
} from '@/server/db/schema';

async function getCertificateBySlug(certificateSlug: string) {
  const [row] = await db
    .select({ id: academyCertificates.id, slug: academyCertificates.slug })
    .from(academyCertificates)
    .where(and(eq(academyCertificates.slug, certificateSlug), eq(academyCertificates.status, 'published')))
    .limit(1);
  return row ?? null;
}

async function countSubmittedAttempts(userId: string, certificateId: string) {
  const [{ count = 0 } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(academyExamAttempts)
    .where(
      and(
        eq(academyExamAttempts.userId, userId),
        eq(academyExamAttempts.certificateId, certificateId),
        isNotNull(academyExamAttempts.submittedAt),
      ),
    );
  return count;
}

async function getLinkedBanks(certificateId: string) {
  return db
    .select({
      questionBankId: academyCertificateQuestionBanks.questionBankId,
      sortOrder: academyCertificateQuestionBanks.sortOrder,
    })
    .from(academyCertificateQuestionBanks)
    .innerJoin(
      academyQuestionBanks,
      eq(academyCertificateQuestionBanks.questionBankId, academyQuestionBanks.id),
    )
    .where(
      and(
        eq(academyCertificateQuestionBanks.certificateId, certificateId),
        eq(academyQuestionBanks.status, 'published'),
      ),
    )
    .orderBy(asc(academyCertificateQuestionBanks.sortOrder));
}

async function getCertificateTitle(certificateId: string, locale: string) {
  const translations = await db
    .select()
    .from(academyCertificateTranslations)
    .where(eq(academyCertificateTranslations.certificateId, certificateId));
  const display = pickTranslationForDisplay(translations, locale);
  return display?.title?.trim() ?? '';
}

export async function getCertificateExamEligibility(
  userId: string,
  certificateSlug: string,
  locale?: string,
) {
  const certificate = await getCertificateBySlug(certificateSlug);
  if (!certificate) {
    return { ok: false as const, code: 'NOT_FOUND' as const };
  }

  const complete = await isCertificateLearningComplete(userId, certificate.id);
  const banks = await getLinkedBanks(certificate.id);
  const submittedCount = await countSubmittedAttempts(userId, certificate.id);

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
  let questionCount = 0;
  let passScorePercent = 60;
  if (banks.length) {
    const [bankRow] = await db
      .select({ passScorePercent: academyQuestionBanks.passScorePercent })
      .from(academyQuestionBanks)
      .where(eq(academyQuestionBanks.id, banks[0]!.questionBankId))
      .limit(1);
    passScorePercent = bankRow?.passScorePercent ?? 60;

    const translations = await db
      .select()
      .from(academyQuestionBankTranslations)
      .where(eq(academyQuestionBankTranslations.questionBankId, banks[0]!.questionBankId));
    const display = pickTranslationForDisplay(translations, defaultLocale);
    examTitle = display?.title?.trim() ?? '';

    const [{ count = 0 } = { count: 0 }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(academyQuestions)
      .where(eq(academyQuestions.questionBankId, banks[0]!.questionBankId));
    questionCount = count;
  }

  const earned = await getUserCertificateForCertificate(userId, certificate.id);
  const hasCertificate = Boolean(earned?.certificateNumber);

  return {
    ok: true as const,
    certificateSlug: certificate.slug,
    certificateId: certificate.id,
    certificateTitle: await getCertificateTitle(certificate.id, defaultLocale),
    isCertificateComplete: complete,
    hasQuestionBanks: banks.length > 0,
    submittedAttempts: submittedCount,
    remainingRetakes,
    canStartExam: !hasCertificate && complete && banks.length > 0 && canRetake,
    examTitle,
    questionCount,
    passScorePercent,
    certificateNumber: earned?.certificateNumber ?? null,
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

export async function startCertificateExamAttempt(
  userId: string,
  certificateSlug: string,
  locale?: string,
) {
  const eligibility = await getCertificateExamEligibility(userId, certificateSlug, locale);
  if (!eligibility.ok) return eligibility;
  if (!eligibility.isCertificateComplete) return { ok: false as const, code: 'CERTIFICATE_INCOMPLETE' as const };
  if (!eligibility.hasQuestionBanks) return { ok: false as const, code: 'NO_EXAM' as const };
  if (!eligibility.canStartExam) return { ok: false as const, code: 'RETAKE_LIMIT' as const };

  const banks = await getLinkedBanks(eligibility.certificateId);
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
      certificateId: eligibility.certificateId,
      questionBankId: picked.questionBankId,
      startedAt: new Date(),
    })
    .returning();

  const totalScore = questions.reduce((sum, q) => sum + q.score, 0);

  return {
    ok: true as const,
    attemptId: attempt.id,
    certificateSlug,
    certificateId: eligibility.certificateId,
    certificateTitle: await getCertificateTitle(eligibility.certificateId, defaultLocale),
    questionBankId: picked.questionBankId,
    title: display?.title?.trim() ?? '',
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

  const [updated] = await db
    .update(academyExamAttempts)
    .set({
      submittedAt: new Date(),
      score,
      totalScore,
      passed,
      answers,
      updatedAt: new Date(),
    })
    .where(and(eq(academyExamAttempts.id, attemptId), isNull(academyExamAttempts.submittedAt)))
    .returning({ id: academyExamAttempts.id });

  if (!updated) return { ok: false as const, code: 'ALREADY_SUBMITTED' as const };

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

export async function getCertificateExamAttemptResult(
  userId: string,
  attemptId: string,
  certificateSlug: string,
  locale?: string,
) {
  const certificate = await getCertificateBySlug(certificateSlug);
  if (!certificate) return { ok: false as const, code: 'NOT_FOUND' as const };

  const [attempt] = await db
    .select()
    .from(academyExamAttempts)
    .where(and(eq(academyExamAttempts.id, attemptId), eq(academyExamAttempts.userId, userId)))
    .limit(1);

  if (!attempt || !attempt.submittedAt) return { ok: false as const, code: 'NOT_FOUND' as const };
  if (attempt.certificateId !== certificate.id) {
    return { ok: false as const, code: 'NOT_FOUND' as const };
  }

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

  const eligibility = await getCertificateExamEligibility(userId, certificateSlug, defaultLocale);
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
    certificateSlug: certificate.slug,
    certificateId: certificate.id,
    certificateTitle: await getCertificateTitle(certificate.id, defaultLocale),
    title: display?.title?.trim() ?? '',
    score: attempt.score ?? 0,
    totalScore: attempt.totalScore ?? 0,
    scorePercent: attempt.totalScore ? Math.round(((attempt.score ?? 0) / attempt.totalScore) * 100) : 0,
    passed: attempt.passed ?? false,
    passScorePercent: bank.passScorePercent,
    correctCount: review.filter((item) => item.isCorrect).length,
    totalQuestions: review.length,
    submittedAt: attempt.submittedAt.toISOString(),
    durationSeconds,
    canRetake: eligibility.ok ? eligibility.canStartExam : false,
    remainingRetakes: eligibility.ok ? eligibility.remainingRetakes : null,
    certificateNumber,
    review,
  };
}

export async function getCertificateExamMeta(certificateId: string, locale?: string) {
  const banks = await getLinkedBanks(certificateId);
  if (!banks.length) {
    return { hasExam: false as const };
  }

  const defaultLocale = locale ?? (await getDefaultSiteLanguageCode());
  const bankId = banks[0]!.questionBankId;
  const [bank] = await db
    .select()
    .from(academyQuestionBanks)
    .where(eq(academyQuestionBanks.id, bankId))
    .limit(1);
  if (!bank) return { hasExam: false as const };

  const translations = await db
    .select()
    .from(academyQuestionBankTranslations)
    .where(eq(academyQuestionBankTranslations.questionBankId, bankId));
  const display = pickTranslationForDisplay(translations, defaultLocale);

  const [{ count = 0 } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(academyQuestions)
    .where(eq(academyQuestions.questionBankId, bankId));

  return {
    hasExam: true as const,
    examTitle: display?.title?.trim() ?? '',
    questionCount: count,
    passScorePercent: bank.passScorePercent,
  };
}

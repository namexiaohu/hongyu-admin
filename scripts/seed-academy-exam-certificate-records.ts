/**
 * Seed real exam attempts + certificates for the first customer user.
 *
 * Usage: pnpm exec tsx scripts/seed-academy-exam-certificate-records.ts
 */
import '@/lib/env';

import { and, asc, eq, inArray, isNotNull } from 'drizzle-orm';

import {
  ACADEMY_CERTIFICATE_ISSUER,
  generateAcademyCertificateNumber,
} from '@/lib/academy-certificate-number';
import type { AcademyQuestionContent, AcademyQuestionType, ExamUserAnswer } from '@/lib/academy-question-content';
import { gradeQuestion } from '@/lib/academy-question-content';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { db } from '@/server/db';
import {
  academyCertificateQuestionBanks,
  academyCertificateTranslations,
  academyCertificates,
  academyExamAttempts,
  academyQuestionBanks,
  academyQuestionTranslations,
  academyQuestions,
  academyUserCertificates,
  users,
} from '@/server/db/schema';

const LOCALE = 'en';

const SEED_MARKER_PASS = '__seed_pass__';
const SEED_MARKER_FAIL = '__seed_fail__';

function wrongAnswer(type: AcademyQuestionType, content: AcademyQuestionContent): ExamUserAnswer {
  switch (type) {
    case 'single_choice': {
      const c = content as { options: string[]; correctAnswerIndex: number };
      return c.correctAnswerIndex === 0 ? 1 : 0;
    }
    case 'multiple_choice': {
      const c = content as { options: string[]; correctAnswerIndexes: number[] };
      const correct = new Set(c.correctAnswerIndexes ?? []);
      const wrongOpts = c.options.map((_, index) => index).filter((index) => !correct.has(index));
      if ((c.correctAnswerIndexes?.length ?? 0) > 1) {
        const partial = c.correctAnswerIndexes.slice(0, -1);
        if (wrongOpts.length > 0) return [...partial, wrongOpts[0]];
        return partial;
      }
      if (wrongOpts.length > 0) return [wrongOpts[0]];
      return c.options.length > 1 ? [c.correctAnswerIndexes[0] === 0 ? 1 : 0] : [];
    }
    case 'true_false': {
      const c = content as { correctAnswer: boolean };
      return !c.correctAnswer;
    }
    case 'fill_blank':
      return 'incorrect-seed-answer';
    default:
      return '';
  }
}

function correctAnswer(type: AcademyQuestionType, content: AcademyQuestionContent): ExamUserAnswer {
  switch (type) {
    case 'single_choice':
      return (content as { correctAnswerIndex: number }).correctAnswerIndex;
    case 'multiple_choice':
      return [...(content as { correctAnswerIndexes: number[] }).correctAnswerIndexes];
    case 'true_false':
      return (content as { correctAnswer: boolean }).correctAnswer;
    case 'fill_blank':
      return (content as { correctAnswer: string }).correctAnswer;
    default:
      return '';
  }
}

async function loadBankQuestions(questionBankId: string) {
  const rows = await db
    .select()
    .from(academyQuestions)
    .where(eq(academyQuestions.questionBankId, questionBankId))
    .orderBy(asc(academyQuestions.sortOrder), asc(academyQuestions.createdAt));

  const translations = rows.length
    ? await db
        .select()
        .from(academyQuestionTranslations)
        .where(inArray(academyQuestionTranslations.questionId, rows.map((r) => r.id)))
    : [];

  return rows.map((row) => {
    const list = translations.filter((t) => t.questionId === row.id);
    const display = pickTranslationForDisplay(list, LOCALE);
    return {
      id: row.id,
      questionType: row.questionType as AcademyQuestionType,
      score: row.score,
      content: (display?.content ?? { prompt: '' }) as AcademyQuestionContent,
    };
  });
}

async function ensureCertificate(
  attemptId: string,
  userId: string,
  certificateId: string,
  recipientName: string,
) {
  const [existing] = await db
    .select({ certificateNumber: academyUserCertificates.certificateNumber })
    .from(academyUserCertificates)
    .where(eq(academyUserCertificates.attemptId, attemptId))
    .limit(1);
  if (existing) return existing.certificateNumber;

  const translations = await db
    .select()
    .from(academyCertificateTranslations)
    .where(eq(academyCertificateTranslations.certificateId, certificateId));
  const title = pickTranslationForDisplay(translations, LOCALE)?.title?.trim() ?? '';
  const issuedAt = new Date();
  const certificateNumber = generateAcademyCertificateNumber(issuedAt);

  await db.insert(academyUserCertificates).values({
    userId,
    certificateId,
    attemptId,
    certificateNumber,
    recipientName,
    title,
    issuerName: ACADEMY_CERTIFICATE_ISSUER,
    issuedAt,
  });
  return certificateNumber;
}

async function upsertAttempt(params: {
  userId: string;
  recipientName: string;
  certificateId: string;
  questionBankId: string;
  passScorePercent: number;
  mode: 'pass' | 'fail';
}) {
  const questions = await loadBankQuestions(params.questionBankId);
  if (!questions.length) {
    console.log(`[seed-records] Skip certificate ${params.certificateId}: no questions`);
    return null;
  }

  const answers: Record<string, ExamUserAnswer> = {};
  for (const question of questions) {
    answers[question.id] =
      params.mode === 'pass'
        ? correctAnswer(question.questionType, question.content)
        : wrongAnswer(question.questionType, question.content);
  }

  const marker = params.mode === 'pass' ? SEED_MARKER_PASS : SEED_MARKER_FAIL;
  const existing = await db
    .select({ id: academyExamAttempts.id, answers: academyExamAttempts.answers, passed: academyExamAttempts.passed })
    .from(academyExamAttempts)
    .where(
      and(
        eq(academyExamAttempts.userId, params.userId),
        eq(academyExamAttempts.certificateId, params.certificateId),
        isNotNull(academyExamAttempts.submittedAt),
      ),
    );

  const already = existing.find((row) => {
    const raw = row.answers as Record<string, unknown>;
    return raw?.[marker] === true;
  });

  let score = 0;
  const totalScore = questions.reduce((sum, q) => sum + q.score, 0);
  for (const question of questions) {
    if (gradeQuestion(question.questionType, question.content, answers[question.id])) {
      score += question.score;
    }
  }
  const percent = totalScore > 0 ? (score / totalScore) * 100 : 0;
  const passed = percent >= params.passScorePercent;
  const sealedAnswers = { ...answers, [marker]: true };

  if (already) {
    await db
      .update(academyExamAttempts)
      .set({
        answers: sealedAnswers,
        score,
        totalScore,
        passed,
        updatedAt: new Date(),
      })
      .where(eq(academyExamAttempts.id, already.id));
    console.log(
      `[seed-records] Refreshed ${params.mode} attempt ${already.id} score=${score}/${totalScore} passed=${passed}`,
    );
    if (passed) {
      const number = await ensureCertificate(
        already.id,
        params.userId,
        params.certificateId,
        params.recipientName,
      );
      console.log(`[seed-records] Certificate ${number}`);
    }
    return already.id;
  }

  const startedAt = new Date(Date.now() - 25 * 60 * 1000);
  const submittedAt = new Date();
  const [attempt] = await db
    .insert(academyExamAttempts)
    .values({
      userId: params.userId,
      certificateId: params.certificateId,
      questionBankId: params.questionBankId,
      startedAt,
      submittedAt,
      score,
      totalScore,
      passed,
      answers: sealedAnswers,
      certificateMailStatus: 'unsent',
    })
    .returning({ id: academyExamAttempts.id });

  console.log(
    `[seed-records] Created ${params.mode} attempt ${attempt.id} score=${score}/${totalScore} passed=${passed}`,
  );

  if (passed) {
    const number = await ensureCertificate(
      attempt.id,
      params.userId,
      params.certificateId,
      params.recipientName,
    );
    console.log(`[seed-records] Certificate ${number}`);
  }

  return attempt.id;
}

async function main() {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(users)
    .where(eq(users.role, 'customer'))
    .limit(1);

  if (!user) {
    throw new Error('No customer user found. Create a front user first.');
  }
  const recipientName = `${user.firstName} ${user.lastName}`.trim();
  console.log(`[seed-records] Using user ${user.email} (${user.id})`);

  const links = await db
    .select({
      certificateId: academyCertificateQuestionBanks.certificateId,
      questionBankId: academyCertificateQuestionBanks.questionBankId,
      certificateSlug: academyCertificates.slug,
    })
    .from(academyCertificateQuestionBanks)
    .innerJoin(
      academyCertificates,
      eq(academyCertificates.id, academyCertificateQuestionBanks.certificateId),
    )
    .limit(20);

  if (!links.length) {
    throw new Error('No certificate↔question-bank links. Run seed-academy-exams.ts first.');
  }

  const passLink = links[0]!;
  const failLink = links[1] ?? links[0]!;

  const [passBank] = await db
    .select({ passScorePercent: academyQuestionBanks.passScorePercent })
    .from(academyQuestionBanks)
    .where(eq(academyQuestionBanks.id, passLink.questionBankId))
    .limit(1);
  const [failBank] = await db
    .select({ passScorePercent: academyQuestionBanks.passScorePercent })
    .from(academyQuestionBanks)
    .where(eq(academyQuestionBanks.id, failLink.questionBankId))
    .limit(1);

  await upsertAttempt({
    userId: user.id,
    recipientName,
    certificateId: passLink.certificateId,
    questionBankId: passLink.questionBankId,
    passScorePercent: passBank?.passScorePercent ?? 60,
    mode: 'pass',
  });

  await upsertAttempt({
    userId: user.id,
    recipientName,
    certificateId: failLink.certificateId,
    questionBankId: failLink.questionBankId,
    passScorePercent: failBank?.passScorePercent ?? 60,
    mode: 'fail',
  });

  console.log('[seed-records] Done.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

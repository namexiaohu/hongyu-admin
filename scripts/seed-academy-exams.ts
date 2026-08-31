/**
 * Seed academy question banks and link them to certificates.
 *
 * Usage: pnpm exec tsx scripts/seed-academy-exams.ts
 */
import '@/lib/env';

import { and, eq } from 'drizzle-orm';

import { db } from '@/server/db';
import {
  academyCertificateQuestionBanks,
  academyCertificateTranslations,
  academyCertificates,
  academyQuestionBankTranslations,
  academyQuestionBanks,
  academyQuestionTranslations,
  academyQuestions,
} from '@/server/db/schema';

const LOCALE = 'en';

type QuestionSeed = {
  questionType: 'single_choice' | 'multiple_choice' | 'true_false' | 'fill_blank';
  score: number;
  content: Record<string, unknown>;
};

const DEFAULT_QUESTIONS: QuestionSeed[] = [
  {
    questionType: 'single_choice',
    score: 10,
    content: {
      prompt: 'Which organ is primarily responsible for filtering blood in mammals?',
      options: ['Heart', 'Kidney', 'Liver', 'Lung'],
      correctAnswerIndex: 1,
    },
  },
  {
    questionType: 'multiple_choice',
    score: 15,
    content: {
      prompt: 'Select all vital signs commonly measured during a physical exam:',
      options: ['Heart rate', 'Respiratory rate', 'Coat color', 'Temperature'],
      correctAnswerIndexes: [0, 1, 3],
    },
  },
  {
    questionType: 'true_false',
    score: 10,
    content: {
      prompt: 'A packed cell volume (PCV) test measures the proportion of red blood cells in blood.',
      correctAnswer: true,
    },
  },
  {
    questionType: 'fill_blank',
    score: 10,
    content: {
      promptBefore: 'The normal resting heart rate range for adult dogs is approximately',
      promptAfter: 'beats per minute.',
      correctAnswer: '60-140',
    },
  },
  {
    questionType: 'single_choice',
    score: 15,
    content: {
      prompt: 'Which fluid is most appropriate for initial rehydration in most canine patients?',
      options: ['Hypertonic saline', 'Lactated Ringer\'s solution', 'Oral glucose', 'Mineral oil'],
      correctAnswerIndex: 1,
    },
  },
];

async function upsertBankForCertificate(certificateId: string, certificateTitle: string) {
  const bankTitle = `${certificateTitle} — Comprehensive Exam`;

  const existingLinks = await db
    .select({ questionBankId: academyCertificateQuestionBanks.questionBankId })
    .from(academyCertificateQuestionBanks)
    .where(eq(academyCertificateQuestionBanks.certificateId, certificateId));

  if (existingLinks.length) {
    console.log(`[seed-exams] Skip ${certificateTitle}: already linked`);
    return;
  }

  const [bank] = await db
    .insert(academyQuestionBanks)
    .values({
      timeLimitMinutes: 45,
      maxRetakes: null,
      passScorePercent: 60,
    })
    .returning();

  await db.insert(academyQuestionBankTranslations).values({
    questionBankId: bank.id,
    locale: LOCALE,
    title: bankTitle,
  });

  for (let index = 0; index < DEFAULT_QUESTIONS.length; index += 1) {
    const q = DEFAULT_QUESTIONS[index]!;
    const [question] = await db
      .insert(academyQuestions)
      .values({
        questionBankId: bank.id,
        sortOrder: (index + 1) * 10,
        questionType: q.questionType,
        score: q.score,
      })
      .returning();

    await db.insert(academyQuestionTranslations).values({
      questionId: question.id,
      locale: LOCALE,
      content: q.content,
    });
  }

  await db.insert(academyCertificateQuestionBanks).values({
    certificateId,
    questionBankId: bank.id,
    sortOrder: 10,
  });

  console.log(`[seed-exams] Linked bank to certificate: ${certificateTitle}`);
}

async function main() {
  const certificates = await db
    .select({ id: academyCertificates.id, slug: academyCertificates.slug })
    .from(academyCertificates);

  if (!certificates.length) {
    console.log('[seed-exams] No certificates found. Run seed-academy.ts first.');
    return;
  }

  for (const certificate of certificates) {
    const [translation] = await db
      .select({ title: academyCertificateTranslations.title })
      .from(academyCertificateTranslations)
      .where(and(eq(academyCertificateTranslations.certificateId, certificate.id), eq(academyCertificateTranslations.locale, LOCALE)))
      .limit(1);

    const title = translation?.title?.trim() || certificate.slug;
    await upsertBankForCertificate(certificate.id, title);
  }

  console.log('[seed-exams] Done.');
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});

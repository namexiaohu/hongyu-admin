import 'server-only';

import { and, asc, eq, inArray, sql } from 'drizzle-orm';

import type {
  AdminAcademyQuestionDetail,
  AdminAcademyQuestionListItem,
  AdminAcademyQuestionTranslation,
  AcademyQuestionContent,
  AcademyQuestionType,
} from '@/lib/academy-question-content';
import {
  adminAcademyQuestionCreateSchema,
  adminAcademyQuestionPatchSchema,
  summarizeQuestionContent,
  validateQuestionContent,
} from '@/lib/academy-question-content';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { db } from '@/server/db';
import {
  academyQuestionBanks,
  academyQuestions,
  academyQuestionTranslations,
} from '@/server/db/schema';
import type { z } from 'zod';

function toIso(value: Date) {
  return value.toISOString();
}

function defaultContent(type: AcademyQuestionType): AcademyQuestionContent {
  switch (type) {
    case 'single_choice':
      return { prompt: '', options: ['Option A', 'Option B'], correctAnswerIndex: 0 };
    case 'multiple_choice':
      return { prompt: '', options: ['Option A', 'Option B'], correctAnswerIndexes: [0] };
    case 'true_false':
      return { prompt: '', correctAnswer: true };
    case 'fill_blank':
      return { promptBefore: '', promptAfter: '', correctAnswer: '' };
    default:
      return { prompt: '', options: ['Option A', 'Option B'], correctAnswerIndex: 0 };
  }
}

function mapTranslation(row: typeof academyQuestionTranslations.$inferSelect): AdminAcademyQuestionTranslation {
  return {
    id: row.id,
    questionId: row.questionId,
    locale: row.locale,
    content: row.content,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function mapListItem(
  row: typeof academyQuestions.$inferSelect,
  summary: string,
  localeCount: number,
): AdminAcademyQuestionListItem {
  return {
    id: row.id,
    questionBankId: row.questionBankId,
    sortOrder: row.sortOrder,
    questionType: row.questionType as AcademyQuestionType,
    score: row.score,
    summary,
    localeCount,
    updatedAt: toIso(row.updatedAt),
  };
}

export async function listAdminAcademyQuestions(questionBankId: string): Promise<AdminAcademyQuestionListItem[]> {
  const defaultLocale = await getDefaultSiteLanguageCode();
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

  return rows.map((row) => {
    const list = tByQuestion.get(row.id) ?? [];
    const display = pickTranslationForDisplay(list, defaultLocale);
    const content = (display?.content ?? defaultContent(row.questionType as AcademyQuestionType)) as AcademyQuestionContent;
    const summary = summarizeQuestionContent(row.questionType as AcademyQuestionType, content);
    return mapListItem(row, summary, list.length);
  });
}

export async function getAdminAcademyQuestionDetail(id: string): Promise<AdminAcademyQuestionDetail | null> {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const [row] = await db.select().from(academyQuestions).where(eq(academyQuestions.id, id)).limit(1);
  if (!row) return null;

  const translations = await db
    .select()
    .from(academyQuestionTranslations)
    .where(eq(academyQuestionTranslations.questionId, id));

  const display = pickTranslationForDisplay(translations, defaultLocale);
  const content = (display?.content ?? defaultContent(row.questionType as AcademyQuestionType)) as AcademyQuestionContent;
  const summary = summarizeQuestionContent(row.questionType as AcademyQuestionType, content);

  return {
    ...mapListItem(row, summary, translations.length),
    translations: translations.map(mapTranslation),
  };
}

export async function createAdminAcademyQuestion(
  questionBankId: string,
  input: z.infer<typeof adminAcademyQuestionCreateSchema>,
): Promise<AdminAcademyQuestionDetail> {
  const parsed = adminAcademyQuestionCreateSchema.parse(input);
  const [bank] = await db.select({ id: academyQuestionBanks.id }).from(academyQuestionBanks).where(eq(academyQuestionBanks.id, questionBankId)).limit(1);
  if (!bank) throw new Error('BANK_NOT_FOUND');

  const content = validateQuestionContent(parsed.questionType, parsed.translation.content);

  const [maxSort] = await db
    .select({ sortOrder: academyQuestions.sortOrder })
    .from(academyQuestions)
    .where(eq(academyQuestions.questionBankId, questionBankId))
    .orderBy(sql`${academyQuestions.sortOrder} desc`)
    .limit(1);

  const [inserted] = await db
    .insert(academyQuestions)
    .values({
      questionBankId,
      sortOrder: (maxSort?.sortOrder ?? 0) + 10,
      questionType: parsed.questionType,
      score: parsed.score,
    })
    .returning();

  await db.insert(academyQuestionTranslations).values({
    questionId: inserted.id,
    locale: parsed.translation.locale,
    content,
  });

  await db.update(academyQuestionBanks).set({ updatedAt: new Date() }).where(eq(academyQuestionBanks.id, questionBankId));

  const detail = await getAdminAcademyQuestionDetail(inserted.id);
  if (!detail) throw new Error('CREATE_FAILED');
  return detail;
}

export async function updateAdminAcademyQuestion(
  id: string,
  input: z.infer<typeof adminAcademyQuestionPatchSchema>,
): Promise<AdminAcademyQuestionDetail | null> {
  const parsed = adminAcademyQuestionPatchSchema.parse(input);
  const [current] = await db.select().from(academyQuestions).where(eq(academyQuestions.id, id)).limit(1);
  if (!current) return null;

  await db
    .update(academyQuestions)
    .set({
      ...(parsed.questionType !== undefined ? { questionType: parsed.questionType } : {}),
      ...(parsed.score !== undefined ? { score: parsed.score } : {}),
      ...(parsed.sortOrder !== undefined ? { sortOrder: parsed.sortOrder } : {}),
      updatedAt: new Date(),
    })
    .where(eq(academyQuestions.id, id));

  await db.update(academyQuestionBanks).set({ updatedAt: new Date() }).where(eq(academyQuestionBanks.id, current.questionBankId));
  return getAdminAcademyQuestionDetail(id);
}

export async function upsertAdminAcademyQuestionTranslation(questionId: string, input: unknown) {
  const { adminAcademyQuestionTranslationSchema } = await import('@/lib/academy-question-content');
  const parsed = adminAcademyQuestionTranslationSchema.parse(input);

  const [question] = await db.select().from(academyQuestions).where(eq(academyQuestions.id, questionId)).limit(1);
  if (!question) return null;

  const content = validateQuestionContent(question.questionType as AcademyQuestionType, parsed.content);

  const [existing] = await db
    .select()
    .from(academyQuestionTranslations)
    .where(and(eq(academyQuestionTranslations.questionId, questionId), eq(academyQuestionTranslations.locale, parsed.locale)))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(academyQuestionTranslations)
      .set({ content, updatedAt: new Date() })
      .where(eq(academyQuestionTranslations.id, existing.id))
      .returning();
    await db.update(academyQuestionBanks).set({ updatedAt: new Date() }).where(eq(academyQuestionBanks.id, question.questionBankId));
    return mapTranslation(updated);
  }

  const [inserted] = await db
    .insert(academyQuestionTranslations)
    .values({
      questionId,
      locale: parsed.locale,
      content,
    })
    .returning();

  await db.update(academyQuestionBanks).set({ updatedAt: new Date() }).where(eq(academyQuestionBanks.id, question.questionBankId));
  return mapTranslation(inserted);
}

export async function reorderAdminAcademyQuestions(questionBankId: string, ids: string[]) {
  const rows = await db
    .select({ id: academyQuestions.id })
    .from(academyQuestions)
    .where(eq(academyQuestions.questionBankId, questionBankId));

  const existingIds = new Set(rows.map((row) => row.id));
  if (ids.length !== existingIds.size || ids.some((id) => !existingIds.has(id))) {
    throw new Error('REORDER_INVALID');
  }

  await db.transaction(async (tx) => {
    for (let index = 0; index < ids.length; index += 1) {
      await tx
        .update(academyQuestions)
        .set({ sortOrder: (index + 1) * 10, updatedAt: new Date() })
        .where(eq(academyQuestions.id, ids[index]!));
    }
  });

  await db.update(academyQuestionBanks).set({ updatedAt: new Date() }).where(eq(academyQuestionBanks.id, questionBankId));
  return listAdminAcademyQuestions(questionBankId);
}

export async function deleteAdminAcademyQuestion(id: string): Promise<boolean> {
  const [current] = await db.select().from(academyQuestions).where(eq(academyQuestions.id, id)).limit(1);
  if (!current) return false;
  await db.delete(academyQuestions).where(eq(academyQuestions.id, id));
  await db.update(academyQuestionBanks).set({ updatedAt: new Date() }).where(eq(academyQuestionBanks.id, current.questionBankId));
  return true;
}

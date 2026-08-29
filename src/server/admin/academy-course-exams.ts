import 'server-only';

import { asc, eq, inArray, sql } from 'drizzle-orm';

import type { AdminAcademyQuestionBankListItem } from '@/lib/academy-question-bank-content';
import { adminAcademyCourseQuestionBanksPatchSchema } from '@/lib/academy-question-bank-content';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { db } from '@/server/db';
import {
  academyCourseQuestionBanks,
  academyCourses,
  academyQuestionBankTranslations,
  academyQuestionBanks,
  academyQuestions,
} from '@/server/db/schema';

export type AdminAcademyCourseQuestionBankItem = {
  questionBankId: string;
  sortOrder: number;
  title: string;
  questionCount: number;
  totalScore: number;
  passScorePercent: number;
  timeLimitMinutes: number | null;
  maxRetakes: number | null;
};

async function syncCourseQuestionBanks(courseId: string, questionBankIds: string[]) {
  const uniqueIds = [...new Set(questionBankIds.filter(Boolean))];
  await db.delete(academyCourseQuestionBanks).where(eq(academyCourseQuestionBanks.courseId, courseId));
  if (!uniqueIds.length) return;
  await db.insert(academyCourseQuestionBanks).values(
    uniqueIds.map((questionBankId, index) => ({
      courseId,
      questionBankId,
      sortOrder: (index + 1) * 10,
    })),
  );
}

export async function listAdminAcademyCourseQuestionBanks(courseId: string): Promise<AdminAcademyCourseQuestionBankItem[]> {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const links = await db
    .select()
    .from(academyCourseQuestionBanks)
    .where(eq(academyCourseQuestionBanks.courseId, courseId))
    .orderBy(asc(academyCourseQuestionBanks.sortOrder));

  if (!links.length) return [];

  const bankIds = links.map((link) => link.questionBankId);
  const banks = await db.select().from(academyQuestionBanks).where(inArray(academyQuestionBanks.id, bankIds));
  const translations = await db
    .select()
    .from(academyQuestionBankTranslations)
    .where(inArray(academyQuestionBankTranslations.questionBankId, bankIds));

  const questionStats = await db
    .select({
      questionBankId: academyQuestions.questionBankId,
      count: sql<number>`count(*)::int`,
      totalScore: sql<number>`coalesce(sum(${academyQuestions.score}), 0)::int`,
    })
    .from(academyQuestions)
    .where(inArray(academyQuestions.questionBankId, bankIds))
    .groupBy(academyQuestions.questionBankId);

  const bankById = new Map(banks.map((row) => [row.id, row]));
  const tByBank = new Map<string, typeof translations>();
  for (const t of translations) {
    const bucket = tByBank.get(t.questionBankId) ?? [];
    bucket.push(t);
    tByBank.set(t.questionBankId, bucket);
  }
  const statsByBank = new Map(questionStats.map((item) => [item.questionBankId, item]));

  return links.map((link) => {
    const bank = bankById.get(link.questionBankId);
    const list = tByBank.get(link.questionBankId) ?? [];
    const display = pickTranslationForDisplay(list, defaultLocale);
    const stats = statsByBank.get(link.questionBankId);
    return {
      questionBankId: link.questionBankId,
      sortOrder: link.sortOrder,
      title: display?.title?.trim() || 'Untitled question bank',
      questionCount: stats?.count ?? 0,
      totalScore: stats?.totalScore ?? 0,
      passScorePercent: bank?.passScorePercent ?? 60,
      timeLimitMinutes: bank?.timeLimitMinutes ?? null,
      maxRetakes: bank?.maxRetakes ?? null,
    };
  });
}

export async function updateAdminAcademyCourseQuestionBanks(courseId: string, input: unknown) {
  const parsed = adminAcademyCourseQuestionBanksPatchSchema.parse(input);
  const [course] = await db.select({ id: academyCourses.id }).from(academyCourses).where(eq(academyCourses.id, courseId)).limit(1);
  if (!course) return null;

  if (parsed.questionBankIds.length) {
    const banks = await db
      .select({ id: academyQuestionBanks.id })
      .from(academyQuestionBanks)
      .where(inArray(academyQuestionBanks.id, parsed.questionBankIds));
    if (banks.length !== parsed.questionBankIds.length) {
      throw new Error('INVALID_BANK_IDS');
    }
  }

  await syncCourseQuestionBanks(courseId, parsed.questionBankIds);
  return listAdminAcademyCourseQuestionBanks(courseId);
}

export async function listQuestionBanksForCoursePicker(): Promise<AdminAcademyQuestionBankListItem[]> {
  const { getAdminAcademyQuestionBankList } = await import('@/server/admin/academy-question-banks');
  const { items } = await getAdminAcademyQuestionBankList();
  return items;
}

import 'server-only';

import { asc, eq, inArray, sql } from 'drizzle-orm';

import type { AdminAcademyQuestionBankListItem } from '@/lib/academy-question-bank-content';
import { adminAcademyCourseQuestionBanksPatchSchema } from '@/lib/academy-question-bank-content';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { db } from '@/server/db';
import {
  academyCertificateQuestionBanks,
  academyCertificates,
  academyQuestionBankTranslations,
  academyQuestionBanks,
  academyQuestions,
} from '@/server/db/schema';

export type AdminAcademyCertificateQuestionBankItem = {
  questionBankId: string;
  sortOrder: number;
  title: string;
  questionCount: number;
  totalScore: number;
  passScorePercent: number;
  timeLimitMinutes: number | null;
  maxRetakes: number | null;
};

async function syncCertificateQuestionBanks(certificateId: string, questionBankIds: string[]) {
  const uniqueIds = [...new Set(questionBankIds.filter(Boolean))];
  await db.delete(academyCertificateQuestionBanks).where(eq(academyCertificateQuestionBanks.certificateId, certificateId));
  if (!uniqueIds.length) return;
  await db.insert(academyCertificateQuestionBanks).values(
    uniqueIds.map((questionBankId, index) => ({
      certificateId,
      questionBankId,
      sortOrder: (index + 1) * 10,
    })),
  );
}

export async function listAdminAcademyCertificateQuestionBanks(
  certificateId: string,
): Promise<AdminAcademyCertificateQuestionBankItem[]> {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const links = await db
    .select()
    .from(academyCertificateQuestionBanks)
    .where(eq(academyCertificateQuestionBanks.certificateId, certificateId))
    .orderBy(asc(academyCertificateQuestionBanks.sortOrder));

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

export async function updateAdminAcademyCertificateQuestionBanks(certificateId: string, input: unknown) {
  const parsed = adminAcademyCourseQuestionBanksPatchSchema.parse(input);
  const [certificate] = await db
    .select({ id: academyCertificates.id })
    .from(academyCertificates)
    .where(eq(academyCertificates.id, certificateId))
    .limit(1);
  if (!certificate) return null;

  if (parsed.questionBankIds.length) {
    const banks = await db
      .select({ id: academyQuestionBanks.id })
      .from(academyQuestionBanks)
      .where(inArray(academyQuestionBanks.id, parsed.questionBankIds));
    if (banks.length !== parsed.questionBankIds.length) {
      throw new Error('INVALID_BANK_IDS');
    }
  }

  await syncCertificateQuestionBanks(certificateId, parsed.questionBankIds);
  return listAdminAcademyCertificateQuestionBanks(certificateId);
}

export async function listQuestionBanksForCertificatePicker(): Promise<AdminAcademyQuestionBankListItem[]> {
  const { getAdminAcademyQuestionBankList } = await import('@/server/admin/academy-question-banks');
  const { items } = await getAdminAcademyQuestionBankList();
  return items;
}

export async function countCertificateQuestionBanks(certificateId: string) {
  const [{ count = 0 } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(academyCertificateQuestionBanks)
    .where(eq(academyCertificateQuestionBanks.certificateId, certificateId));
  return count;
}

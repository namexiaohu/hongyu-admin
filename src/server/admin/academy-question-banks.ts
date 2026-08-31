import 'server-only';

import { and, asc, eq, inArray, sql } from 'drizzle-orm';

import type {
  AdminAcademyQuestionBankDetail,
  AdminAcademyQuestionBankListItem,
  AdminAcademyQuestionBankTranslation,
  AcademyQuestionBankPickerItem,
} from '@/lib/academy-question-bank-content';
import {
  adminAcademyQuestionBankCreateSchema,
  adminAcademyQuestionBankPatchSchema,
} from '@/lib/academy-question-bank-content';
import { normalizeAcademyListingStatus } from '@/lib/academy-content-shared';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { db } from '@/server/db';
import {
  academyQuestionBankTranslations,
  academyQuestionBanks,
  academyQuestions,
} from '@/server/db/schema';
import type { z } from 'zod';

function toIso(value: Date) {
  return value.toISOString();
}

function mapTranslation(row: typeof academyQuestionBankTranslations.$inferSelect): AdminAcademyQuestionBankTranslation {
  return {
    id: row.id,
    questionBankId: row.questionBankId,
    locale: row.locale,
    title: row.title,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function mapListItem(
  row: typeof academyQuestionBanks.$inferSelect,
  title: string,
  localeCount: number,
  questionCount: number,
  totalScore: number,
): AdminAcademyQuestionBankListItem {
  return {
    id: row.id,
    title,
    status: normalizeAcademyListingStatus(row.status),
    questionCount,
    totalScore,
    passScorePercent: row.passScorePercent,
    timeLimitMinutes: row.timeLimitMinutes,
    maxRetakes: row.maxRetakes,
    localeCount,
    publishedAt: row.publishedAt ? toIso(row.publishedAt) : null,
    updatedAt: toIso(row.updatedAt),
  };
}

export async function getAdminAcademyQuestionBankList(): Promise<{ items: AdminAcademyQuestionBankListItem[]; total: number }> {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const rows = await db
    .select()
    .from(academyQuestionBanks)
    .orderBy(asc(academyQuestionBanks.updatedAt));

  if (!rows.length) return { items: [], total: 0 };

  const bankIds = rows.map((row) => row.id);
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

  const tByBank = new Map<string, typeof translations>();
  for (const t of translations) {
    const bucket = tByBank.get(t.questionBankId) ?? [];
    bucket.push(t);
    tByBank.set(t.questionBankId, bucket);
  }
  const statsByBank = new Map(questionStats.map((item) => [item.questionBankId, item]));

  const items = rows.map((row) => {
    const list = tByBank.get(row.id) ?? [];
    const display = pickTranslationForDisplay(list, defaultLocale);
    const stats = statsByBank.get(row.id);
    return mapListItem(
      row,
      display?.title?.trim() || 'Untitled question bank',
      list.length,
      stats?.count ?? 0,
      stats?.totalScore ?? 0,
    );
  });

  return { items, total: items.length };
}

export async function getAdminAcademyQuestionBankDetail(id: string): Promise<AdminAcademyQuestionBankDetail | null> {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const [row] = await db.select().from(academyQuestionBanks).where(eq(academyQuestionBanks.id, id)).limit(1);
  if (!row) return null;

  const translations = await db
    .select()
    .from(academyQuestionBankTranslations)
    .where(eq(academyQuestionBankTranslations.questionBankId, id));

  const [{ count = 0, totalScore = 0 } = { count: 0, totalScore: 0 }] = await db
    .select({
      count: sql<number>`count(*)::int`,
      totalScore: sql<number>`coalesce(sum(${academyQuestions.score}), 0)::int`,
    })
    .from(academyQuestions)
    .where(eq(academyQuestions.questionBankId, id));

  const display = pickTranslationForDisplay(translations, defaultLocale);
  return {
    ...mapListItem(row, display?.title?.trim() || 'Untitled question bank', translations.length, count, totalScore),
    translations: translations.map(mapTranslation),
  };
}

export async function createAdminAcademyQuestionBank(
  input: z.infer<typeof adminAcademyQuestionBankCreateSchema>,
): Promise<AdminAcademyQuestionBankDetail> {
  const parsed = adminAcademyQuestionBankCreateSchema.parse(input);
  const status = parsed.status ?? 'published';
  const [inserted] = await db
    .insert(academyQuestionBanks)
    .values({
      status,
      publishedAt: status === 'published' ? new Date() : null,
      timeLimitMinutes: parsed.timeLimitMinutes ?? null,
      maxRetakes: parsed.maxRetakes ?? null,
      passScorePercent: parsed.passScorePercent,
    })
    .returning();

  await db.insert(academyQuestionBankTranslations).values({
    questionBankId: inserted.id,
    locale: parsed.translation.locale,
    title: parsed.translation.title ?? '',
  });

  const detail = await getAdminAcademyQuestionBankDetail(inserted.id);
  if (!detail) throw new Error('CREATE_FAILED');
  return detail;
}

export async function updateAdminAcademyQuestionBank(
  id: string,
  input: z.infer<typeof adminAcademyQuestionBankPatchSchema>,
): Promise<AdminAcademyQuestionBankDetail | null> {
  const parsed = adminAcademyQuestionBankPatchSchema.parse(input);
  const [current] = await db.select().from(academyQuestionBanks).where(eq(academyQuestionBanks.id, id)).limit(1);
  if (!current) return null;

  const nextStatus = parsed.status !== undefined
    ? normalizeAcademyListingStatus(parsed.status)
    : normalizeAcademyListingStatus(current.status);

  await db
    .update(academyQuestionBanks)
    .set({
      ...(parsed.status !== undefined ? { status: nextStatus } : {}),
      ...(parsed.timeLimitMinutes !== undefined ? { timeLimitMinutes: parsed.timeLimitMinutes } : {}),
      ...(parsed.maxRetakes !== undefined ? { maxRetakes: parsed.maxRetakes } : {}),
      ...(parsed.passScorePercent !== undefined ? { passScorePercent: parsed.passScorePercent } : {}),
      ...(nextStatus === 'published' && !current.publishedAt ? { publishedAt: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(academyQuestionBanks.id, id));

  return getAdminAcademyQuestionBankDetail(id);
}

export async function upsertAdminAcademyQuestionBankTranslation(questionBankId: string, input: unknown) {
  const { adminAcademyQuestionBankTranslationSchema } = await import('@/lib/academy-question-bank-content');
  const parsed = adminAcademyQuestionBankTranslationSchema.parse(input);

  const [bank] = await db.select({ id: academyQuestionBanks.id }).from(academyQuestionBanks).where(eq(academyQuestionBanks.id, questionBankId)).limit(1);
  if (!bank) return null;

  const [existing] = await db
    .select()
    .from(academyQuestionBankTranslations)
    .where(and(eq(academyQuestionBankTranslations.questionBankId, questionBankId), eq(academyQuestionBankTranslations.locale, parsed.locale)))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(academyQuestionBankTranslations)
      .set({ title: parsed.title ?? '', updatedAt: new Date() })
      .where(eq(academyQuestionBankTranslations.id, existing.id))
      .returning();
    return mapTranslation(updated);
  }

  const [inserted] = await db
    .insert(academyQuestionBankTranslations)
    .values({
      questionBankId,
      locale: parsed.locale,
      title: parsed.title ?? '',
    })
    .returning();

  await db.update(academyQuestionBanks).set({ updatedAt: new Date() }).where(eq(academyQuestionBanks.id, questionBankId));
  return mapTranslation(inserted);
}

export async function deleteAdminAcademyQuestionBank(id: string): Promise<boolean> {
  const [current] = await db.select({ id: academyQuestionBanks.id }).from(academyQuestionBanks).where(eq(academyQuestionBanks.id, id)).limit(1);
  if (!current) return false;
  await db.delete(academyQuestionBanks).where(eq(academyQuestionBanks.id, id));
  return true;
}

export async function lookupAdminAcademyQuestionBanks(ids: string[]): Promise<AcademyQuestionBankPickerItem[]> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return [];

  const defaultLocale = await getDefaultSiteLanguageCode();
  const rows = await db.select().from(academyQuestionBanks).where(inArray(academyQuestionBanks.id, uniqueIds));
  if (!rows.length) return [];

  const bankIds = rows.map((row) => row.id);
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

  const tByBank = new Map<string, typeof translations>();
  for (const t of translations) {
    const bucket = tByBank.get(t.questionBankId) ?? [];
    bucket.push(t);
    tByBank.set(t.questionBankId, bucket);
  }
  const statsByBank = new Map(questionStats.map((item) => [item.questionBankId, item]));
  const rowById = new Map(rows.map((row) => [row.id, row]));

  return uniqueIds
    .map((id) => {
      const row = rowById.get(id);
      if (!row) return null;
      const list = tByBank.get(id) ?? [];
      const display = pickTranslationForDisplay(list, defaultLocale);
      const stats = statsByBank.get(id);
      return {
        id,
        title: display?.title?.trim() || 'Untitled question bank',
        questionCount: stats?.count ?? 0,
        totalScore: stats?.totalScore ?? 0,
        passScorePercent: row.passScorePercent ?? 60,
      } satisfies AcademyQuestionBankPickerItem;
    })
    .filter((item): item is AcademyQuestionBankPickerItem => item !== null);
}

export async function searchAdminAcademyQuestionBanks(keyword: string, excludeIds: string[] = []) {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const { items } = await getAdminAcademyQuestionBankList();
  const kw = keyword.trim().toLowerCase();
  const exclude = new Set(excludeIds);
  return items.filter((item) => !exclude.has(item.id) && (!kw || item.title.toLowerCase().includes(kw)));
}

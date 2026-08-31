import { z } from 'zod';

import { academyStatuses, type AcademyStatus } from '@/lib/academy-content-shared';

export type AdminAcademyQuestionBankListItem = {
  id: string;
  title: string;
  status: AcademyStatus;
  questionCount: number;
  totalScore: number;
  passScorePercent: number;
  timeLimitMinutes: number | null;
  maxRetakes: number | null;
  localeCount: number;
  publishedAt: string | null;
  updatedAt: string;
};

export type AdminAcademyQuestionBankTranslation = {
  id: string;
  questionBankId: string;
  locale: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminAcademyQuestionBankDetail = AdminAcademyQuestionBankListItem & {
  translations: AdminAcademyQuestionBankTranslation[];
};

export const adminAcademyQuestionBankTranslationSchema = z.object({
  locale: z.string().min(2).max(16),
  title: z.string().max(255).optional().default(''),
});

export const adminAcademyQuestionBankCreateSchema = z.object({
  status: z.enum(academyStatuses).optional().default('published'),
  timeLimitMinutes: z.number().int().min(1).nullable().optional(),
  maxRetakes: z.number().int().min(0).nullable().optional(),
  passScorePercent: z.number().int().min(1).max(100).optional().default(60),
  translation: adminAcademyQuestionBankTranslationSchema,
});

export const adminAcademyQuestionBankPatchSchema = z.object({
  status: z.enum(academyStatuses).optional(),
  timeLimitMinutes: z.number().int().min(1).nullable().optional(),
  maxRetakes: z.number().int().min(0).nullable().optional(),
  passScorePercent: z.number().int().min(1).max(100).optional(),
});

export type AcademyQuestionBankPickerItem = {
  id: string;
  title: string;
  questionCount: number;
  totalScore: number;
  passScorePercent: number;
};

export function formatAcademyQuestionBankSelectedDisplay(item: AcademyQuestionBankPickerItem) {
  return {
    name: item.title,
    meta: `${item.questionCount} 题 · 总分 ${item.totalScore} · 及格线 ${item.passScorePercent}%`,
  };
}

export const adminAcademyCourseQuestionBanksPatchSchema = z.object({
  questionBankIds: z.array(z.string().uuid()),
});

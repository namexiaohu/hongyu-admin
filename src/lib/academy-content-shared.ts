import { z } from 'zod';

import { heroCoverDisplaySchema } from '@/lib/hero-cover-display';

/** published = 上架，draft = 下架（暂不使用 archived） */
export const academyStatuses = ['published', 'draft'] as const;
export type AcademyStatus = (typeof academyStatuses)[number];

export const academyStatusLabels: Record<AcademyStatus, string> = {
  published: '上架',
  draft: '下架',
};

export const academyStatusColors: Record<AcademyStatus, string> = {
  published: 'green',
  draft: 'default',
};

/** DB 仍可能有 archived；列表/编辑统一归一为上架或下架 */
export function normalizeAcademyListingStatus(status: string): AcademyStatus {
  return status === 'published' ? 'published' : 'draft';
}

export type AcademyStat = {
  label: string;
  value: string;
};

export const academyStatSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export function normalizeAcademyStats(stats: AcademyStat[] | undefined): AcademyStat[] {
  return (stats ?? [])
    .map((item) => ({ label: item.label?.trim() ?? '', value: item.value?.trim() ?? '' }))
    .filter((item) => item.label || item.value);
}

export function normalizeStringTags(tags: string[] | undefined): string[] {
  return (tags ?? []).map((tag) => tag.trim()).filter(Boolean);
}

export const academyTranslationFieldsSchema = z.object({
  locale: z.string().trim().min(2),
  title: z.string().trim().min(1),
  summary: z.string().optional().default(''),
  description: z.string().optional().default(''),
  seoTitle: z.string().optional().default(''),
  seoDescription: z.string().optional().default(''),
  stats: z.array(academyStatSchema).optional().default([]),
  learnings: z.array(z.string()).optional().default([]),
  skills: z.array(z.string()).optional().default([]),
  tools: z.array(z.string()).optional().default([]),
});

export const academyTranslationPatchSchema = academyTranslationFieldsSchema.partial();

const coverModeSchema = z.enum(['preset', 'upload', '']);

const galleryItemSchema = z.object({
  url: z.string(),
  alt: z.string().optional().default(''),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
});

export const academySharedFieldsSchema = z.object({
  slug: z.string().trim().min(1).optional(),
  status: z.enum(academyStatuses).optional(),
  sortOrder: z.number().int().optional(),
  coverMode: coverModeSchema.optional(),
  coverValue: z.string().optional(),
  coverImage: z.string().optional(),
  gallery: z.array(galleryItemSchema).optional(),
  videoUrl: z.string().optional(),
  showCoverOnBackground: z.boolean().optional(),
  coverDisplay: heroCoverDisplaySchema.optional(),
  teacherCount: z.number().int().min(0).optional(),
  studentCount: z.number().int().min(0).optional(),
});

export function resolveAcademyDisplayTitle(
  translation: { title?: string } | null | undefined,
  slug: string,
): string {
  return translation?.title?.trim() || slug;
}

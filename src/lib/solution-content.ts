import { z } from 'zod';

import {
  solutionBlockTypes,
  solutionSplitLayouts,
  solutionSummaryIcons,
  solutionSummaryLayouts,
  type SolutionBlockDraft,
} from '@/lib/solution-blocks';

export type SolutionSlug = string;

export const reservedSolutionSlugs = [
  'admin',
  'api',
  'new',
  'edit',
  'category-tabs',
  'random',
] as const;

export const solutionStatuses = ['draft', 'published', 'archived'] as const;
export type SolutionStatus = (typeof solutionStatuses)[number];

export type SolutionStat = {
  label: string;
  value: string;
};

export type SolutionProductParam = {
  label: string;
  value: string;
};

export type SolutionMaterial = {
  name: string;
  url: string;
  mimeType: string;
};

export type AdminSolutionListItem = {
  id: string;
  slug: SolutionSlug;
  boardKeys: string[];
  sortOrder: number;
  status: SolutionStatus;
  coverImage: string;
  title: string;
  localeCount: number;
  publishedAt: string | null;
  updatedAt: string;
};

export type AdminSolutionTranslation = {
  id: string;
  solutionId: string;
  locale: string;
  title: string;
  largeTitle: string;
  description: string;
  badgeText: string;
  seoTitle: string;
  seoDescription: string;
  stats: SolutionStat[];
  productParams: SolutionProductParam[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type AdminSolutionDetail = AdminSolutionListItem & {
  materials: SolutionMaterial[];
  blocks: SolutionBlockDraft[];
  translations: AdminSolutionTranslation[];
};

const localeCopySchema = z.object({
  smallTitle: z.string().optional().default(''),
  largeTitle: z.string().optional().default(''),
  description: z.string().optional().default(''),
  buttonLabel: z.string().optional().default(''),
  badge: z.string().optional().default(''),
  totalHours: z.string().optional().default(''),
  teachingFormat: z.string().optional().default(''),
  trainingCycle: z.string().optional().default(''),
});

const blockItemSchema = z.object({
  id: z.string().trim().min(1),
  icon: z.enum(solutionSummaryIcons).optional(),
  coverImage: z.string().optional(),
  locales: z.record(localeCopySchema).optional(),
});

export const solutionBlockSchema = z.object({
  id: z.string().trim().min(1),
  type: z.enum(solutionBlockTypes),
  layout: z.union([z.enum(solutionSplitLayouts), z.enum(solutionSummaryLayouts)]).optional(),
  carouselImages: z.array(z.object({
    id: z.string().trim().min(1),
    url: z.string(),
  })).optional(),
  href: z.string().optional(),
  productIds: z.array(z.string().trim().min(1)).optional().default([]),
  locales: z.record(localeCopySchema).default({}),
  items: z.array(blockItemSchema).default([]),
});

export const solutionBlocksSchema = z.array(solutionBlockSchema);

const statSchema = z.object({
  label: z.string(),
  value: z.string(),
});

const productParamSchema = z.object({
  label: z.string(),
  value: z.string(),
});

const materialSchema = z.object({
  name: z.string(),
  url: z.string(),
  mimeType: z.string(),
});

export const adminSolutionTranslationSchema = z.object({
  locale: z.string().trim().min(2),
  title: z.string().trim().min(1),
  largeTitle: z.string().optional().default(''),
  description: z.string().optional().default(''),
  badgeText: z.string().optional().default(''),
  seoTitle: z.string().optional().default(''),
  seoDescription: z.string().optional().default(''),
  stats: z.array(statSchema).optional().default([]),
  productParams: z.array(productParamSchema).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
});

export const adminSolutionTranslationPatchSchema = adminSolutionTranslationSchema.partial();

export const adminSolutionPatchSchema = z.object({
  slug: z.string().trim().min(1).max(64).optional(),
  boardKeys: z.array(z.string()).optional(),
  status: z.enum(solutionStatuses).optional(),
  sortOrder: z.number().int().optional(),
  coverImage: z.string().optional(),
  materials: z.array(materialSchema).optional(),
  blocks: solutionBlocksSchema.optional(),
  publishedAt: z.coerce.date().nullable().optional(),
});

export const adminSolutionCreateSchema = z.object({
  slug: z.string().trim().min(1).max(64),
  boardKeys: z.array(z.string()).optional().default([]),
  status: z.enum(solutionStatuses).optional(),
  coverImage: z.string().optional().default(''),
  materials: z.array(materialSchema).optional().default([]),
  blocks: solutionBlocksSchema.optional(),
  translation: adminSolutionTranslationSchema,
});

export function resolveSolutionDisplayTitle(
  translation: { title?: string } | null | undefined,
  fallback = '',
): string {
  return translation?.title?.trim() || fallback;
}

import { z } from 'zod';

import {
  brandNarrativeBlockTypes,
  brandNarrativeSplitLayouts,
  brandNarrativeSummaryIcons,
  brandNarrativeSummaryLayouts,
  type BrandNarrativeBlockDraft,
} from '@/lib/brand-narrative-blocks';
import type { ProductGalleryImage } from '@/lib/product-content';

export const brandNarrativeSlugs = ['about', 'patents', 'history', 'training'] as const;
export type BrandNarrativeSeedSlug = (typeof brandNarrativeSlugs)[number];
export type BrandNarrativeSlug = string;

export const reservedBrandNarrativeSlugs = [
  'admin',
  'api',
  'login',
  'solutions',
  'insights',
  'contact',
  'company',
  'media',
  'partnership',
  'surgeons',
  'centers',
  'education',
  'products',
  'blog',
  'cart',
  'account',
  'search',
  'c',
] as const;

export const brandNarrativeStatuses = ['draft', 'published', 'archived'] as const;
export type BrandNarrativeStatus = (typeof brandNarrativeStatuses)[number];

export type BrandNarrativeStat = {
  label: string;
  value: string;
};

export type AdminBrandNarrativeListItem = {
  id: string;
  slug: BrandNarrativeSlug;
  sortOrder: number;
  status: BrandNarrativeStatus;
  coverImage: string;
  gallery: ProductGalleryImage[];
  videoUrl: string;
  backgroundMode: '' | 'solid' | 'preset' | 'upload';
  backgroundValue: string;
  backgroundImage: string;
  backgroundPreviewUrl: string;
  showCoverOnBackground: boolean;
  title: string;
  localeCount: number;
  publishedAt: string | null;
  updatedAt: string;
};

export type AdminBrandNarrativeTranslation = {
  id: string;
  narrativeId: string;
  locale: string;
  title: string;
  largeTitle: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  stats: BrandNarrativeStat[];
  createdAt: string;
  updatedAt: string;
};

export type AdminBrandNarrativeDetail = AdminBrandNarrativeListItem & {
  blocks: BrandNarrativeBlockDraft[];
  translations: AdminBrandNarrativeTranslation[];
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
  icon: z.enum(brandNarrativeSummaryIcons).optional(),
  coverImage: z.string().optional(),
  locales: z.record(localeCopySchema).optional(),
});

export const brandNarrativeBlockSchema = z.object({
  id: z.string().trim().min(1),
  type: z.enum(brandNarrativeBlockTypes),
  layout: z.union([z.enum(brandNarrativeSplitLayouts), z.enum(brandNarrativeSummaryLayouts)]).optional(),
  carouselImages: z.array(z.object({
    id: z.string().trim().min(1),
    url: z.string(),
  })).optional(),
  videoUrl: z.string().optional(),
  href: z.string().optional(),
  locales: z.record(localeCopySchema).default({}),
  items: z.array(blockItemSchema).default([]),
});

export const brandNarrativeBlocksSchema = z.array(brandNarrativeBlockSchema);

const statSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const adminBrandNarrativeTranslationSchema = z.object({
  locale: z.string().trim().min(2),
  title: z.string().trim().min(1),
  largeTitle: z.string().optional().default(''),
  description: z.string().optional().default(''),
  seoTitle: z.string().optional().default(''),
  seoDescription: z.string().optional().default(''),
  stats: z.array(statSchema).optional().default([]),
});

export const adminBrandNarrativeTranslationPatchSchema = adminBrandNarrativeTranslationSchema.partial();

const backgroundModeSchema = z.enum(['solid', 'preset', 'upload', '']);

const galleryItemSchema = z.object({
  url: z.string().trim().min(1),
  alt: z.string().trim().default(''),
  width: z.number().int().nullable().optional(),
  height: z.number().int().nullable().optional(),
});

export const adminBrandNarrativePatchSchema = z.object({
  slug: z.string().trim().min(1).max(64).optional(),
  status: z.enum(brandNarrativeStatuses).optional(),
  sortOrder: z.number().int().optional(),
  coverImage: z.string().optional(),
  gallery: z.array(galleryItemSchema).optional(),
  videoUrl: z.string().optional(),
  backgroundMode: backgroundModeSchema.optional(),
  backgroundValue: z.string().optional(),
  showCoverOnBackground: z.boolean().optional(),
  blocks: brandNarrativeBlocksSchema.optional(),
  publishedAt: z.coerce.date().nullable().optional(),
});

export const adminBrandNarrativeCreateSchema = z.object({
  slug: z.string().trim().min(1).max(64),
  status: z.enum(brandNarrativeStatuses).optional(),
  coverImage: z.string().optional().default(''),
  gallery: z.array(galleryItemSchema).optional().default([]),
  videoUrl: z.string().optional().default(''),
  backgroundMode: backgroundModeSchema.optional().default(''),
  backgroundValue: z.string().optional().default(''),
  showCoverOnBackground: z.boolean().optional().default(true),
  blocks: brandNarrativeBlocksSchema.optional(),
  translation: adminBrandNarrativeTranslationSchema,
});

export function resolveBrandNarrativeDisplayTitle(
  translation: { title?: string } | null | undefined,
  fallback = '',
): string {
  return translation?.title?.trim() || fallback;
}

export const BRAND_NARRATIVE_META: Record<
  BrandNarrativeSeedSlug,
  {
    sortOrder: number;
    listTitle: string;
  }
> = {
  about: {
    sortOrder: 1,
    listTitle: '企业介绍',
  },
  patents: {
    sortOrder: 2,
    listTitle: '技术专利',
  },
  history: {
    sortOrder: 3,
    listTitle: '发展历程',
  },
  training: {
    sortOrder: 4,
    listTitle: '培训计划',
  },
};

export function resolveNarrativePageMeta(slug: string) {
  if (slug in BRAND_NARRATIVE_META) {
    return BRAND_NARRATIVE_META[slug as BrandNarrativeSeedSlug];
  }
  return {
    sortOrder: 0,
    listTitle: slug,
  };
}

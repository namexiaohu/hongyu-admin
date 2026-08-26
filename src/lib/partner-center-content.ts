import { z } from 'zod';

import type { CoverImageMode } from '@/lib/cover-presets';
import { heroCopyStyleOptionalSchema, heroCopyStyleSchema, type HeroCopyStyle } from '@/lib/hero-copy-style';
import { heroCoverDisplaySchema, type HeroCoverDisplay } from '@/lib/hero-cover-display';
import type { PartnerCenterBackgroundMode } from '@/lib/partner-center-background-presets';
import type { ProductGalleryImage } from '@/lib/product-content';

export const centerRegions = [
  'north-america',
  'south-america',
  'europe',
  'china',
  'asia-pacific',
  'africa',
] as const;

export type CenterRegion = (typeof centerRegions)[number];

/** Admin UI default (Chinese). */
export const centerRegionLabels: Record<CenterRegion, string> = {
  'north-america': '北美',
  'south-america': '南美',
  'europe': '欧洲',
  'china': '中国',
  'asia-pacific': '亚太',
  'africa': '非洲',
};

export const centerRegionLabelsZh = centerRegionLabels;

export const centerRegionLabelsEn: Record<CenterRegion, string> = {
  'north-america': 'North America',
  'south-america': 'South America',
  'europe': 'Europe',
  'china': 'China',
  'asia-pacific': 'Asia Pacific',
  'africa': 'Africa',
};

export const centerRegionLabelsEs: Record<CenterRegion, string> = {
  'north-america': 'América del Norte',
  'south-america': 'América del Sur',
  'europe': 'Europa',
  'china': 'China',
  'asia-pacific': 'Asia-Pacífico',
  'africa': 'África',
};

export function centerRegionLabelForLocale(region: CenterRegion, locale: string): string {
  const normalized = locale.trim().toLowerCase();
  if (normalized.startsWith('zh')) return centerRegionLabelsZh[region];
  if (normalized.startsWith('es')) return centerRegionLabelsEs[region];
  return centerRegionLabelsEn[region];
}

export type PartnerCenterMetric = {
  label: string;
  value: string;
};

export const partnerCenterBackgroundModes = ['solid', 'preset', 'upload', ''] as const;

export type AdminPartnerCenterListItem = {
  id: string;
  slug: string;
  region: CenterRegion;
  email: string;
  website: string;
  coverImage: string;
  coverMode: CoverImageMode;
  coverValue: string;
  coverPreviewUrl: string;
  gallery: ProductGalleryImage[];
  videoUrl: string;
  logo: string;
  /** @deprecated prefer backgroundMode/value; may still hold legacy key */
  backgroundImage: string;
  backgroundMode: PartnerCenterBackgroundMode;
  backgroundValue: string;
  /** Admin preview: resolved image URL or empty (solid uses CSS on client) */
  backgroundPreviewUrl: string;
  showCoverOnBackground: boolean;
  coverDisplay: HeroCoverDisplay;
  heroCopyStyle: HeroCopyStyle | null;
  sortOrder: number;
  name: string;
  localeCount: number;
  updatedAt: string;
};

export type AdminPartnerCenterTranslation = {
  id: string;
  centerId: string;
  locale: string;
  name: string;
  description: string;
  detailDescription: string;
  location: string;
  badgeText: string;
  address: string;
  businessHours: string;
  contact: string;
  tags: string[];
  stats: PartnerCenterMetric[];
  cooperationInfo: PartnerCenterMetric[];
  createdAt: string;
  updatedAt: string;
};

export type AdminPartnerCenterDetail = AdminPartnerCenterListItem & {
  translations: AdminPartnerCenterTranslation[];
  surgeonIds: string[];
};

const metricSchema = z.object({
  label: z.string().trim().default(''),
  value: z.string().trim().default(''),
});

export const adminPartnerCenterTranslationSchema = z.object({
  locale: z.string().trim().min(2),
  name: z.string().trim().min(1),
  description: z.string().optional().default(''),
  detailDescription: z.string().optional().default(''),
  location: z.string().optional().default(''),
  badgeText: z.string().optional().default(''),
  address: z.string().optional().default(''),
  businessHours: z.string().optional().default(''),
  contact: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
  stats: z.array(metricSchema).optional().default([]),
  cooperationInfo: z.array(metricSchema).optional().default([]),
});

export const adminPartnerCenterTranslationPatchSchema = adminPartnerCenterTranslationSchema.partial();

const backgroundModeSchema = z.enum(['solid', 'preset', 'upload', '']);
const coverModeSchema = z.enum(['preset', 'upload', '']);

const galleryItemSchema = z.object({
  url: z.string().trim().min(1),
  alt: z.string().trim().default(''),
  width: z.number().int().nullable().optional(),
  height: z.number().int().nullable().optional(),
});

export const adminPartnerCenterPatchSchema = z.object({
  slug: z.string().trim().min(1).max(64).optional(),
  region: z.enum(centerRegions).optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  coverImage: z.string().optional(),
  coverMode: coverModeSchema.optional(),
  coverValue: z.string().optional(),
  gallery: z.array(galleryItemSchema).optional(),
  videoUrl: z.string().optional(),
  logo: z.string().optional(),
  backgroundMode: backgroundModeSchema.optional(),
  backgroundValue: z.string().optional(),
  showCoverOnBackground: z.boolean().optional(),
  coverDisplay: heroCoverDisplaySchema.optional(),
  heroCopyStyle: heroCopyStyleOptionalSchema,
  sortOrder: z.number().int().optional(),
  surgeonIds: z.array(z.string().uuid()).optional(),
});

export const adminPartnerCenterCreateSchema = z.object({
  slug: z.string().trim().min(1).max(64),
  region: z.enum(centerRegions).optional().default('asia-pacific'),
  email: z.string().optional().default(''),
  website: z.string().optional().default(''),
  coverImage: z.string().optional().default(''),
  coverMode: coverModeSchema.optional().default(''),
  coverValue: z.string().optional().default(''),
  gallery: z.array(galleryItemSchema).optional().default([]),
  videoUrl: z.string().optional().default(''),
  logo: z.string().optional().default(''),
  backgroundMode: backgroundModeSchema.optional().default(''),
  backgroundValue: z.string().optional().default(''),
  showCoverOnBackground: z.boolean().optional().default(true),
  coverDisplay: heroCoverDisplaySchema.optional(),
  heroCopyStyle: heroCopyStyleSchema.optional().default('light'),
  sortOrder: z.number().int().optional(),
  surgeonIds: z.array(z.string().uuid()).optional().default([]),
  translation: adminPartnerCenterTranslationSchema,
});

export function resolveCenterDisplayName(
  translation: { name?: string } | null | undefined,
  fallback = '',
): string {
  return translation?.name?.trim() || fallback;
}

export function normalizePartnerCenterMetrics(
  input: Array<{ label?: string; value?: string }> | undefined,
): PartnerCenterMetric[] {
  if (!input?.length) return [];
  return input
    .map((row) => ({
      label: row.label?.trim() ?? '',
      value: row.value?.trim() ?? '',
    }))
    .filter((row) => row.label || row.value);
}

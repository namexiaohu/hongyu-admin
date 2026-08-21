import { z } from 'zod';

export const centerRegions = [
  'asia-pacific',
  'europe',
  'north-america',
  'latin-america',
  'middle-east-africa',
  'oceania',
] as const;

export type CenterRegion = (typeof centerRegions)[number];

export const centerRegionLabels: Record<CenterRegion, string> = {
  'asia-pacific': '亚太地区',
  'europe': '欧洲',
  'north-america': '北美',
  'latin-america': '拉丁美洲',
  'middle-east-africa': '中东与非洲',
  'oceania': '大洋洲',
};

export type PartnerCenterMetric = {
  label: string;
  value: string;
};

export type AdminPartnerCenterListItem = {
  id: string;
  slug: string;
  region: CenterRegion;
  email: string;
  website: string;
  coverImage: string;
  logo: string;
  backgroundImage: string;
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

export const adminPartnerCenterPatchSchema = z.object({
  slug: z.string().trim().min(1).max(64).optional(),
  region: z.enum(centerRegions).optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  coverImage: z.string().optional(),
  logo: z.string().optional(),
  backgroundImage: z.string().optional(),
  sortOrder: z.number().int().optional(),
  surgeonIds: z.array(z.string().uuid()).optional(),
});

export const adminPartnerCenterCreateSchema = z.object({
  slug: z.string().trim().min(1).max(64),
  region: z.enum(centerRegions).optional().default('asia-pacific'),
  email: z.string().optional().default(''),
  website: z.string().optional().default(''),
  coverImage: z.string().optional().default(''),
  logo: z.string().optional().default(''),
  backgroundImage: z.string().optional().default(''),
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

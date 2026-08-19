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

export type AdminPartnerCenterListItem = {
  id: string;
  slug: string;
  region: CenterRegion;
  coverImage: string;
  logo: string;
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
  location: string;
  badgeText: string;
  address: string;
  businessHours: string;
  contact: string;
  website: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type AdminPartnerCenterDetail = AdminPartnerCenterListItem & {
  translations: AdminPartnerCenterTranslation[];
};

export const adminPartnerCenterTranslationSchema = z.object({
  locale: z.string().trim().min(2),
  name: z.string().trim().min(1),
  description: z.string().optional().default(''),
  location: z.string().optional().default(''),
  badgeText: z.string().optional().default(''),
  address: z.string().optional().default(''),
  businessHours: z.string().optional().default(''),
  contact: z.string().optional().default(''),
  website: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
});

export const adminPartnerCenterTranslationPatchSchema = adminPartnerCenterTranslationSchema.partial();

export const adminPartnerCenterPatchSchema = z.object({
  slug: z.string().trim().min(1).max(64).optional(),
  region: z.enum(centerRegions).optional(),
  coverImage: z.string().optional(),
  logo: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const adminPartnerCenterCreateSchema = z.object({
  slug: z.string().trim().min(1).max(64),
  region: z.enum(centerRegions).optional().default('asia-pacific'),
  coverImage: z.string().optional().default(''),
  logo: z.string().optional().default(''),
  sortOrder: z.number().int().optional(),
  translation: adminPartnerCenterTranslationSchema,
});

export function resolveCenterDisplayName(
  translation: { name?: string } | null | undefined,
  fallback = '',
): string {
  return translation?.name?.trim() || fallback;
}

import { z } from 'zod';

import { centerRegions, type CenterRegion } from '@/lib/partner-center-content';

export const socialPlatformTypes = [
  'facebook',
  'instagram',
  'x',
  'linkedin',
  'whatsapp',
  'youtube',
  'wechat',
] as const;

export type SocialPlatformType = (typeof socialPlatformTypes)[number];

export const socialPlatformLabels: Record<SocialPlatformType, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  x: 'X (Twitter)',
  linkedin: 'LinkedIn',
  whatsapp: 'WhatsApp',
  youtube: 'YouTube',
  wechat: '微信',
};

export type SocialChannel = {
  type: SocialPlatformType | '';
  url: string;
  qrCode: string;
  name: string;
};

export type OverseasContact = {
  region: CenterRegion | '';
  location: string;
  phone: string;
  contactPerson: string;
  email: string;
  address: string;
};

export type FeaturedPost = {
  coverImage: string;
  badgeText: string;
  title: string;
  description: string;
  url: string;
};

export type AdminSocialMediaTranslation = {
  id: string;
  profileId: string;
  locale: string;
  featuredPosts: FeaturedPost[];
  createdAt: string;
  updatedAt: string;
};

export type AdminSocialMediaProfile = {
  id: string;
  socialChannels: SocialChannel[];
  overseasContacts: OverseasContact[];
  translations: AdminSocialMediaTranslation[];
  createdAt: string;
  updatedAt: string;
};

export type StorefrontSocialMediaProfile = {
  locale: string;
  socialChannels: Array<SocialChannel & { type: SocialPlatformType }>;
  overseasContacts: Array<OverseasContact & {
    region: CenterRegion;
    regionLabel: string;
  }>;
  featuredPosts: FeaturedPost[];
};

const socialChannelSchema = z.object({
  type: z.enum(socialPlatformTypes).or(z.literal('')).optional().default(''),
  url: z.string().optional().default(''),
  qrCode: z.string().optional().default(''),
  name: z.string().optional().default(''),
});

const overseasContactSchema = z.object({
  region: z.enum(centerRegions).or(z.literal('')).optional().default(''),
  location: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  contactPerson: z.string().optional().default(''),
  email: z.string().optional().default(''),
  address: z.string().optional().default(''),
});

const featuredPostSchema = z.object({
  coverImage: z.string().optional().default(''),
  badgeText: z.string().optional().default(''),
  title: z.string().optional().default(''),
  description: z.string().optional().default(''),
  url: z.string().optional().default(''),
});

export const adminSocialMediaTranslationSchema = z.object({
  locale: z.string().trim().min(2),
  featuredPosts: z.array(featuredPostSchema).optional().default([]),
});

export const adminSocialMediaPutSchema = z.object({
  socialChannels: z.array(socialChannelSchema).optional().default([]),
  overseasContacts: z.array(overseasContactSchema).optional().default([]),
  translations: z.array(adminSocialMediaTranslationSchema).optional().default([]),
});

export type AdminSocialMediaPutInput = z.infer<typeof adminSocialMediaPutSchema>;

export function compactSocialChannels(rows: SocialChannel[] | undefined): SocialChannel[] {
  return (rows ?? [])
    .map((row) => ({
      type: row.type ?? '',
      url: row.url?.trim() ?? '',
      qrCode: row.qrCode?.trim() ?? '',
      name: row.name?.trim() ?? '',
    }))
    .filter((row) => row.type || row.url || row.qrCode || row.name);
}

export function compactOverseasContacts(rows: OverseasContact[] | undefined): OverseasContact[] {
  return (rows ?? [])
    .map((row) => ({
      region: row.region ?? '',
      location: row.location?.trim() ?? '',
      phone: row.phone?.trim() ?? '',
      contactPerson: row.contactPerson?.trim() ?? '',
      email: row.email?.trim() ?? '',
      address: row.address?.trim() ?? '',
    }))
    .filter((row) => row.region || row.location || row.phone || row.contactPerson || row.email || row.address);
}

export function compactFeaturedPosts(rows: FeaturedPost[] | undefined): FeaturedPost[] {
  return (rows ?? [])
    .map((row) => ({
      coverImage: row.coverImage?.trim() ?? '',
      badgeText: row.badgeText?.trim() ?? '',
      title: row.title?.trim() ?? '',
      description: row.description?.trim() ?? '',
      url: row.url?.trim()
        ?? (row as FeaturedPost & { contentUrl?: string }).contentUrl?.trim()
        ?? '',
    }))
    .filter((row) => row.coverImage || row.badgeText || row.title || row.description || row.url);
}

export function translationHasContent(input: {
  featuredPosts?: FeaturedPost[];
}) {
  return compactFeaturedPosts(input.featuredPosts).length > 0;
}

export const regionLabelsEn: Record<CenterRegion, string> = {
  'asia-pacific': 'Asia Pacific',
  europe: 'Europe',
  'north-america': 'North America',
  'latin-america': 'Latin America',
  'middle-east-africa': 'Middle East & Africa',
  oceania: 'Oceania',
};

export const regionLabelsZh: Record<CenterRegion, string> = {
  'asia-pacific': '亚太区',
  europe: '欧洲区',
  'north-america': '北美区',
  'latin-america': '拉丁美洲',
  'middle-east-africa': '中东与非洲',
  oceania: '大洋洲',
};

export function regionLabelForLocale(region: CenterRegion, locale: string) {
  return locale.toLowerCase().startsWith('zh')
    ? regionLabelsZh[region]
    : regionLabelsEn[region];
}

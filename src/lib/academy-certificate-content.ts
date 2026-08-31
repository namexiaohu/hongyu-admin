import { z } from 'zod';

import {
  academySharedFieldsSchema,
  academyStatuses,
  academyTranslationFieldsSchema,
  academyTranslationPatchSchema,
  type AcademyStat,
  type AcademyStatus,
} from '@/lib/academy-content-shared';
import type { HeroCoverDisplay } from '@/lib/hero-cover-display';
import type { ProductGalleryImage } from '@/lib/product-content';

export type AcademyCertificateSlug = string;

export const reservedAcademyCertificateSlugs = [
  'admin',
  'api',
  'auth',
  'courses',
  'certificates',
  'credentials',
] as const;

export type AdminAcademyCertificateListItem = {
  id: string;
  slug: AcademyCertificateSlug;
  sortOrder: number;
  status: AcademyStatus;
  coverImage: string;
  coverMode: '' | 'preset' | 'upload';
  coverValue: string;
  coverPreviewUrl: string;
  gallery: ProductGalleryImage[];
  videoUrl: string;
  showCoverOnBackground: boolean;
  coverDisplay: HeroCoverDisplay;
  teacherCount: number;
  studentCount: number;
  title: string;
  localeCount: number;
  courseCount: number;
  publishedAt: string | null;
  updatedAt: string;
};

export type AdminAcademyCertificateTranslation = {
  id: string;
  certificateId: string;
  locale: string;
  title: string;
  subtitle: string;
  badgeLabel: string;
  summary: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  stats: AcademyStat[];
  learnings: string[];
  skills: string[];
  tools: string[];
  createdAt: string;
  updatedAt: string;
};

export type AdminAcademyCertificateDetail = AdminAcademyCertificateListItem & {
  courseIds: string[];
  courseLinks: Array<{ id: string; courseId: string; sortOrder: number }>;
  translations: AdminAcademyCertificateTranslation[];
};

export const adminAcademyCertificateTranslationSchema = academyTranslationFieldsSchema.extend({
  subtitle: z.string().optional().default(''),
  badgeLabel: z.string().optional().default(''),
});

export const adminAcademyCertificateCreateSchema = academySharedFieldsSchema.extend({
  translation: adminAcademyCertificateTranslationSchema,
  courseIds: z.array(z.string().uuid()).optional().default([]),
});

export const adminAcademyCertificatePatchSchema = academySharedFieldsSchema.extend({
  courseIds: z.array(z.string().uuid()).optional(),
}).partial();

export type AdminAcademyCertificateCourseItem = {
  courseId: string;
  sortOrder: number;
  title: string;
  slug: string;
  status: AcademyStatus;
  coverPreviewUrl: string;
};

export const adminAcademyCertificateCoursesPatchSchema = z.object({
  courseIds: z.array(z.string().uuid()),
});

export { academyStatuses, academyTranslationPatchSchema };

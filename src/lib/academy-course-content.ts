import { z } from 'zod';

import {
  academySharedFieldsSchema,
  academyTranslationFieldsSchema,
  type AcademyStat,
  type AcademyStatus,
} from '@/lib/academy-content-shared';
import type { HeroCoverDisplay } from '@/lib/hero-cover-display';
import type { ProductGalleryImage } from '@/lib/product-content';

export type AcademyCourseSlug = string;

export const reservedAcademyCourseSlugs = [
  'admin',
  'api',
  'auth',
  'courses',
  'certificates',
  'credentials',
  'learn',
  'exam',
] as const;

export type AdminAcademyCourseListItem = {
  id: string;
  slug: AcademyCourseSlug;
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
  publishedAt: string | null;
  updatedAt: string;
};

export type AdminAcademyCourseTranslation = {
  id: string;
  courseId: string;
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

export type AdminAcademyCourseDetail = AdminAcademyCourseListItem & {
  translations: AdminAcademyCourseTranslation[];
};

export const adminAcademyCourseTranslationSchema = academyTranslationFieldsSchema.extend({
  subtitle: z.string().optional().default(''),
  badgeLabel: z.string().optional().default(''),
});

export const adminAcademyCourseCreateSchema = academySharedFieldsSchema.extend({
  translation: adminAcademyCourseTranslationSchema,
});

export const adminAcademyCoursePatchSchema = academySharedFieldsSchema.partial();

import { z } from 'zod';

export type AdminAcademyUnitListItem = {
  id: string;
  courseId: string;
  sortOrder: number;
  coverImage: string;
  coverMode: '' | 'preset' | 'upload';
  coverValue: string;
  coverPreviewUrl: string;
  title: string;
  lessonCount: number;
  localeCount: number;
  updatedAt: string;
};

export type AdminAcademyUnitTranslation = {
  id: string;
  unitId: string;
  locale: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminAcademyUnitDetail = AdminAcademyUnitListItem & {
  translations: AdminAcademyUnitTranslation[];
};

export const adminAcademyUnitTranslationSchema = z.object({
  locale: z.string().min(2).max(16),
  title: z.string().max(255).optional().default(''),
});

export const adminAcademyUnitCreateSchema = z.object({
  coverMode: z.enum(['', 'preset', 'upload']).optional(),
  coverValue: z.string().optional(),
  translation: adminAcademyUnitTranslationSchema,
});

export const adminAcademyUnitPatchSchema = z.object({
  coverMode: z.enum(['', 'preset', 'upload']).optional(),
  coverValue: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const adminAcademyUnitReorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

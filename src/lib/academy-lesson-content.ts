import { z } from 'zod';

export type AcademyLessonMaterial = {
  name: string;
  url: string;
  mimeType: string;
  size?: number | null;
};

export const academyLessonMaterialSchema = z.object({
  name: z.string().max(255),
  url: z.string().min(1),
  mimeType: z.string().max(128).optional().default('application/octet-stream'),
  size: z.number().int().nonnegative().nullable().optional(),
});

export type AdminAcademyLessonListItem = {
  id: string;
  unitId: string;
  sortOrder: number;
  videoUrl: string;
  durationSeconds: number;
  materials: AcademyLessonMaterial[];
  title: string;
  localeCount: number;
  updatedAt: string;
};

export type AdminAcademyLessonTranslation = {
  id: string;
  lessonId: string;
  locale: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminAcademyLessonDetail = AdminAcademyLessonListItem & {
  translations: AdminAcademyLessonTranslation[];
};

export const adminAcademyLessonTranslationSchema = z.object({
  locale: z.string().min(2).max(16),
  title: z.string().max(255).optional().default(''),
  description: z.string().optional().default(''),
});

export const adminAcademyLessonCreateSchema = z.object({
  videoUrl: z.string().optional().default(''),
  durationSeconds: z.number().int().min(0).optional().default(0),
  materials: z.array(academyLessonMaterialSchema).optional().default([]),
  translation: adminAcademyLessonTranslationSchema,
});

export const adminAcademyLessonPatchSchema = z.object({
  videoUrl: z.string().optional(),
  durationSeconds: z.number().int().min(0).optional(),
  materials: z.array(academyLessonMaterialSchema).optional(),
  sortOrder: z.number().int().optional(),
});

export const adminAcademyLessonReorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

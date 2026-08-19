import { z } from 'zod';

export const surgeonGradeKeys = ['platinum', 'gold', 'silver'] as const;
export type SurgeonGradeKey = (typeof surgeonGradeKeys)[number];

export type AdminSurgeonListItem = {
  id: string;
  slug: string;
  avatar: string;
  gradeKey: SurgeonGradeKey;
  sortOrder: number;
  name: string;
  localeCount: number;
  updatedAt: string;
};

export type AdminSurgeonTranslation = {
  id: string;
  surgeonId: string;
  locale: string;
  name: string;
  position: string;
  institution: string;
  expertise: string;
  experience: string;
  gradeTitle: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type AdminSurgeonDetail = AdminSurgeonListItem & {
  translations: AdminSurgeonTranslation[];
};

export const adminSurgeonTranslationSchema = z.object({
  locale: z.string().trim().min(2),
  name: z.string().trim().min(1),
  position: z.string().optional().default(''),
  institution: z.string().optional().default(''),
  expertise: z.string().optional().default(''),
  experience: z.string().optional().default(''),
  gradeTitle: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
});

export const adminSurgeonTranslationPatchSchema = adminSurgeonTranslationSchema.partial();

export const adminSurgeonPatchSchema = z.object({
  slug: z.string().trim().min(1).max(64).optional(),
  avatar: z.string().optional(),
  gradeKey: z.enum(surgeonGradeKeys).optional(),
  sortOrder: z.number().int().optional(),
});

export const adminSurgeonCreateSchema = z.object({
  slug: z.string().trim().min(1).max(64),
  avatar: z.string().optional().default(''),
  gradeKey: z.enum(surgeonGradeKeys).optional().default('silver'),
  sortOrder: z.number().int().optional(),
  translation: adminSurgeonTranslationSchema,
});

export function resolveSurgeonDisplayName(
  translation: { name?: string } | null | undefined,
  fallback = '',
): string {
  return translation?.name?.trim() || fallback;
}

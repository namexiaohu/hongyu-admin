import { z } from 'zod';

export const surgeonGradeKeys = ['platinum', 'gold', 'silver'] as const;
export type SurgeonGradeKey = (typeof surgeonGradeKeys)[number];

export type SurgeonMetric = {
  label: string;
  value: string;
};

export type AdminSurgeonListItem = {
  id: string;
  slug: string;
  avatar: string;
  gradeKey: SurgeonGradeKey;
  certificationYear: number | null;
  surgeryCount: number | null;
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
  detailDescription: string;
  tags: string[];
  otherCertifications: SurgeonMetric[];
  specialties: string[];
  createdAt: string;
  updatedAt: string;
};

export type AdminSurgeonDetail = AdminSurgeonListItem & {
  translations: AdminSurgeonTranslation[];
};

const metricSchema = z.object({
  label: z.string().trim().default(''),
  value: z.string().trim().default(''),
});

export const adminSurgeonTranslationSchema = z.object({
  locale: z.string().trim().min(2),
  name: z.string().trim().min(1),
  position: z.string().optional().default(''),
  institution: z.string().optional().default(''),
  expertise: z.string().optional().default(''),
  experience: z.string().optional().default(''),
  gradeTitle: z.string().optional().default(''),
  detailDescription: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
  otherCertifications: z.array(metricSchema).optional().default([]),
  specialties: z.array(z.string()).optional().default([]),
});

export const adminSurgeonTranslationPatchSchema = adminSurgeonTranslationSchema.partial();

export const adminSurgeonPatchSchema = z.object({
  slug: z.string().trim().min(1).max(64).optional(),
  avatar: z.string().optional(),
  gradeKey: z.enum(surgeonGradeKeys).optional(),
  certificationYear: z.number().int().nullable().optional(),
  surgeryCount: z.number().int().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export const adminSurgeonCreateSchema = z.object({
  slug: z.string().trim().min(1).max(64),
  avatar: z.string().optional().default(''),
  gradeKey: z.enum(surgeonGradeKeys).optional().default('silver'),
  certificationYear: z.number().int().nullable().optional(),
  surgeryCount: z.number().int().nullable().optional(),
  sortOrder: z.number().int().optional(),
  translation: adminSurgeonTranslationSchema,
});

export function resolveSurgeonDisplayName(
  translation: { name?: string } | null | undefined,
  fallback = '',
): string {
  return translation?.name?.trim() || fallback;
}

export function normalizeSurgeonMetrics(
  input: Array<{ label?: string; value?: string }> | undefined,
): SurgeonMetric[] {
  if (!input?.length) return [];
  return input
    .map((row) => ({
      label: row.label?.trim() ?? '',
      value: row.value?.trim() ?? '',
    }))
    .filter((row) => row.label || row.value);
}

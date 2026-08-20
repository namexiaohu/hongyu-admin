import { z } from 'zod';
import type { AgendaGroup, SpeakerItem } from '@/server/db/schema';

export { type AgendaGroup, type SpeakerItem };
export type { AgendaItem } from '@/server/db/schema';

export const summitStatuses = ['upcoming', 'registering', 'completed'] as const;
export type SummitStatus = (typeof summitStatuses)[number];

export const summitStatusLabels: Record<SummitStatus, string> = {
  upcoming: '即将举办',
  registering: '报名中',
  completed: '已结束',
};

// ── Zod schemas ──────────────────────────────────────────────

const agendaItemLocaleCopySchema = z.object({
  title: z.string().default(''),
  desc: z.string().default(''),
  speaker: z.string().default(''),
});

const agendaItemSchema = z.object({
  id: z.string(),
  startTime: z.string().default(''),
  endTime: z.string().default(''),
  title: z.string().default(''),
  desc: z.string().default(''),
  speaker: z.string().default(''),
  locales: z.record(z.string(), agendaItemLocaleCopySchema).optional(),
});

const agendaGroupLocaleCopySchema = z.object({
  dayLabel: z.string().default(''),
  groupTitle: z.string().default(''),
});

const agendaGroupSchema = z.object({
  id: z.string(),
  dayLabel: z.string().default(''),
  groupTitle: z.string().default(''),
  items: z.array(agendaItemSchema).default([]),
  locales: z.record(z.string(), agendaGroupLocaleCopySchema).optional(),
});

const speakerItemSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  avatar: z.string().default(''),
  bio: z.string().default(''),
  expertise: z.string().default(''),
});

export const adminSummitTranslationSchema = z.object({
  locale: z.string().trim().min(2),
  title: z.string().trim().min(1),
  description: z.string().optional().default(''),
  scale: z.string().optional().default(''),
  duration: z.string().optional().default(''),
  location: z.string().optional().default(''),
  address: z.string().optional().default(''),
  transportation: z.string().optional().default(''),
  speakers: z.array(speakerItemSchema).optional().default([]),
});

export const adminSummitPatchSchema = z.object({
  slug: z.string().trim().min(1).max(64).optional(),
  status: z.enum(summitStatuses).optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  coverImage: z.string().optional(),
  venueImage: z.string().optional(),
  agenda: z.array(agendaGroupSchema).optional(),
  sortOrder: z.number().int().optional(),
});

export const adminSummitCreateSchema = z.object({
  slug: z.string().trim().min(1).max(64),
  status: z.enum(summitStatuses).optional().default('upcoming'),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  coverImage: z.string().optional().default(''),
  venueImage: z.string().optional().default(''),
  agenda: z.array(agendaGroupSchema).optional().default([]),
  sortOrder: z.number().int().optional(),
  translation: adminSummitTranslationSchema,
});

// ── TypeScript types ─────────────────────────────────────────

export type AdminSummitTranslation = {
  id: string;
  summitId: string;
  locale: string;
  title: string;
  description: string;
  scale: string;
  duration: string;
  location: string;
  address: string;
  transportation: string;
  speakers: SpeakerItem[];
  createdAt: string;
  updatedAt: string;
};

export type AdminSummitListItem = {
  id: string;
  slug: string;
  status: SummitStatus;
  startDate: string | null;
  endDate: string | null;
  coverImage: string;
  venueImage: string;
  sortOrder: number;
  title: string;
  localeCount: number;
  updatedAt: string;
};

export type AdminSummitDetail = AdminSummitListItem & {
  agenda: AgendaGroup[];
  translations: AdminSummitTranslation[];
};

export function resolveSummitDisplayTitle(
  translation: { title?: string } | null | undefined,
  fallback = '',
): string {
  return translation?.title?.trim() || fallback;
}

export function localizeAgendaGroups(agenda: AgendaGroup[], locale: string): AgendaGroup[] {
  const code = locale.trim();
  return agenda.map((group) => {
    const groupCopy = group.locales?.[code];
    return {
      id: group.id,
      dayLabel: groupCopy?.dayLabel?.trim() || group.dayLabel,
      groupTitle: groupCopy?.groupTitle?.trim() || group.groupTitle,
      items: group.items.map((item) => {
        const itemCopy = item.locales?.[code];
        return {
          id: item.id,
          startTime: item.startTime,
          endTime: item.endTime,
          title: itemCopy?.title?.trim() || item.title,
          desc: itemCopy?.desc?.trim() || item.desc,
          speaker: itemCopy?.speaker?.trim() || item.speaker,
        };
      }),
    };
  });
}

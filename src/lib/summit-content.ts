import { z } from 'zod';
import type { AgendaGroup, SpeakerItem, SponsorItem, SummitStat } from '@/server/db/schema';
import { heroCopyStyleOptionalSchema, heroCopyStyleSchema, type HeroCopyStyle } from '@/lib/hero-copy-style';

export { type AgendaGroup, type SpeakerItem, type SponsorItem, type SummitStat };
export type { AgendaItem } from '@/server/db/schema';

export const summitStatuses = ['upcoming', 'registering', 'completed'] as const;
export type SummitStatus = (typeof summitStatuses)[number];

export const summitStatusLabels: Record<SummitStatus, string> = {
  upcoming: '即将举办',
  registering: '报名中',
  completed: '已结束',
};

export const sponsorTiers = ['diamond', 'gold', 'silver'] as const;
export type SponsorTier = (typeof sponsorTiers)[number];

export const sponsorTierLabels: Record<SponsorTier, string> = {
  diamond: '钻石',
  gold: '金牌',
  silver: '银牌',
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

const summitStatSchema = z.object({
  label: z.string().default(''),
  value: z.string().default(''),
});

const speakerItemSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  avatar: z.string().default(''),
  bio: z.string().default(''),
  expertise: z.string().default(''),
  region: z.string().optional().default(''),
  badgeText: z.string().optional().default(''),
  description: z.string().optional().default(''),
});

const sponsorItemSchema = z.object({
  id: z.string(),
  tier: z.enum(sponsorTiers).default('gold'),
  name: z.string().default(''),
  logo: z.string().default(''),
  badgeText: z.string().default(''),
  intro: z.string().default(''),
});

export const adminSummitTranslationSchema = z.object({
  locale: z.string().trim().min(2),
  title: z.string().trim().min(1),
  description: z.string().optional().default(''),
  detailDescription: z.string().optional().default(''),
  scale: z.string().optional().default(''),
  duration: z.string().optional().default(''),
  location: z.string().optional().default(''),
  address: z.string().optional().default(''),
  transportation: z.string().optional().default(''),
  stats: z.array(summitStatSchema).optional().default([]),
  speakers: z.array(speakerItemSchema).optional().default([]),
  sponsors: z.array(sponsorItemSchema).optional().default([]),
});

export const adminSummitPatchSchema = z.object({
  slug: z.string().trim().min(1).max(64).optional(),
  status: z.enum(summitStatuses).optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  coverImage: z.string().optional(),
  coverMode: z.enum(['preset', 'upload', '']).optional(),
  coverValue: z.string().optional(),
  videoUrl: z.string().optional(),
  backgroundMode: z.enum(['', 'solid', 'preset', 'upload']).optional(),
  backgroundValue: z.string().optional(),
  showCoverOnBackground: z.boolean().optional(),
  heroCopyStyle: heroCopyStyleOptionalSchema,
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
  coverMode: z.enum(['preset', 'upload', '']).optional().default(''),
  coverValue: z.string().optional().default(''),
  videoUrl: z.string().optional().default(''),
  backgroundMode: z.enum(['', 'solid', 'preset', 'upload']).optional().default(''),
  backgroundValue: z.string().optional().default(''),
  showCoverOnBackground: z.boolean().optional().default(true),
  heroCopyStyle: heroCopyStyleSchema.optional().default('light'),
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
  detailDescription: string;
  scale: string;
  duration: string;
  location: string;
  address: string;
  transportation: string;
  stats: SummitStat[];
  speakers: SpeakerItem[];
  sponsors: SponsorItem[];
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
  coverMode: '' | 'preset' | 'upload';
  coverValue: string;
  coverPreviewUrl: string;
  videoUrl: string;
  backgroundMode: '' | 'solid' | 'preset' | 'upload';
  backgroundValue: string;
  backgroundImage: string;
  backgroundPreviewUrl: string;
  showCoverOnBackground: boolean;
  heroCopyStyle: HeroCopyStyle | null;
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

export function normalizeSummitStats(input: Array<{ label?: string; value?: string }> | undefined): SummitStat[] {
  if (!input?.length) return [];
  return input
    .map((row) => ({
      label: row.label?.trim() ?? '',
      value: row.value?.trim() ?? '',
    }))
    .filter((row) => row.label || row.value);
}

export function normalizeSpeakerItems(input: SpeakerItem[] | undefined): SpeakerItem[] {
  if (!input?.length) return [];
  return input.map((speaker) => ({
    id: speaker.id,
    name: speaker.name?.trim() ?? '',
    avatar: speaker.avatar?.trim() ?? '',
    bio: speaker.bio?.trim() ?? '',
    expertise: speaker.expertise?.trim() ?? '',
    region: speaker.region?.trim() ?? '',
    badgeText: speaker.badgeText?.trim() ?? '',
    description: speaker.description ?? '',
  }));
}

export function normalizeSponsorItems(input: SponsorItem[] | undefined): SponsorItem[] {
  if (!input?.length) return [];
  return input.map((sponsor) => ({
    id: sponsor.id,
    tier: sponsorTiers.includes(sponsor.tier) ? sponsor.tier : 'gold',
    name: sponsor.name?.trim() ?? '',
    logo: sponsor.logo?.trim() ?? '',
    badgeText: sponsor.badgeText?.trim() ?? '',
    intro: sponsor.intro?.trim() ?? '',
  }));
}

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

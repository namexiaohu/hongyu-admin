import 'server-only';

import { asc, desc, eq, inArray } from 'drizzle-orm';

import { resolveOssAssetUrl } from '@/lib/oss-asset-url';
import { resolveStorefrontCoverUrl } from '@/lib/cover-presets';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { localizeAgendaGroups, type AgendaGroup, type SpeakerItem, type SummitStatus } from '@/lib/summit-content';
import { db } from '@/server/db';
import { summits, summitTranslations } from '@/server/db/schema';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';

export type StorefrontSpeakerItem = {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  expertise: string;
};

export type StorefrontSummitItem = {
  slug: string;
  status: SummitStatus;
  startDate: string | null;
  endDate: string | null;
  coverImage: string;
  title: string;
  description: string;
  scale: string;
  duration: string;
  location: string;
};

export type StorefrontSummitDetail = StorefrontSummitItem & {
  venueImage: string;
  address: string;
  transportation: string;
  speakers: StorefrontSpeakerItem[];
  agenda: AgendaGroup[];
};

export type StorefrontSummitsResponse = {
  locale: string;
  upcoming: StorefrontSummitItem[];
  completed: StorefrontSummitItem[];
};

function toIso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

function resolveTranslation(
  rows: (typeof summitTranslations.$inferSelect)[],
  locale: string,
  defaultLocale: string,
) {
  return rows.find((t) => t.locale.toLowerCase() === locale.toLowerCase())
    ?? pickTranslationForDisplay(rows, defaultLocale);
}

function mapToItem(
  row: typeof summits.$inferSelect,
  t: typeof summitTranslations.$inferSelect | null | undefined,
): StorefrontSummitItem {
  return {
    slug: row.slug,
    status: row.status as SummitStatus,
    startDate: toIso(row.startDate),
    endDate: toIso(row.endDate),
    coverImage: resolveStorefrontCoverUrl({
      mode: row.coverMode,
      value: row.coverValue,
      legacyCoverImageKey: row.coverImage,
      toPublicUrl: resolveOssAssetUrl,
    }),
    title: t?.title ?? row.slug,
    description: t?.description ?? '',
    scale: t?.scale ?? '',
    duration: t?.duration ?? '',
    location: t?.location ?? '',
  };
}

export async function getStorefrontSummitsList(input: { locale: string }): Promise<StorefrontSummitsResponse> {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const rows = await db.select().from(summits).orderBy(asc(summits.sortOrder));

  const ids = rows.map((r) => r.id);
  const translations = ids.length
    ? await db.select().from(summitTranslations).where(inArray(summitTranslations.summitId, ids))
    : [];

  const byId = new Map<string, (typeof summitTranslations.$inferSelect)[]>();
  for (const t of translations) {
    const b = byId.get(t.summitId) ?? [];
    b.push(t);
    byId.set(t.summitId, b);
  }

  const upcoming: StorefrontSummitItem[] = [];
  const completed: StorefrontSummitItem[] = [];

  for (const row of rows) {
    const rowT = byId.get(row.id) ?? [];
    const display = resolveTranslation(rowT, input.locale, defaultLocale);
    const item = mapToItem(row, display);

    if (row.status === 'completed') {
      completed.push(item);
    } else {
      upcoming.push(item);
    }
  }

  // Sort upcoming: registering first, then upcoming; within each group by startDate asc
  upcoming.sort((a, b) => {
    const statusOrder: Record<string, number> = { registering: 0, upcoming: 1 };
    const so = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
    if (so !== 0) return so;
    if (!a.startDate && !b.startDate) return 0;
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  // Sort completed: startDate desc
  completed.sort((a, b) => {
    if (!a.startDate && !b.startDate) return 0;
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
  });

  return { locale: input.locale, upcoming, completed };
}

export async function getStorefrontSummitDetail(input: { slug: string; locale: string }): Promise<StorefrontSummitDetail | null> {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const [row] = await db.select().from(summits).where(eq(summits.slug, input.slug)).limit(1);
  if (!row) return null;

  const translations = await db.select().from(summitTranslations)
    .where(eq(summitTranslations.summitId, row.id))
    .orderBy(asc(summitTranslations.locale));

  const display = resolveTranslation(translations, input.locale, defaultLocale);

  const speakers = ((display?.speakers ?? []) as SpeakerItem[]).map((s) => ({
    id: s.id,
    name: s.name,
    avatar: resolveOssAssetUrl(s.avatar),
    bio: s.bio,
    expertise: s.expertise,
  }));

  return {
    ...mapToItem(row, display),
    venueImage: resolveOssAssetUrl(row.venueImage),
    address: display?.address ?? '',
    transportation: display?.transportation ?? '',
    speakers,
    agenda: localizeAgendaGroups((row.agenda ?? []) as AgendaGroup[], input.locale),
  };
}

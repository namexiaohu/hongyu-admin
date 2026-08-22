import 'server-only';

import { asc, eq, inArray } from 'drizzle-orm';

import { resolvePartnerCenterBackgroundDisplay } from '@/lib/partner-center-background-presets';
import { rewriteHtmlOssAssets, resolveOssAssetUrl } from '@/lib/oss-asset-url';
import { resolveStorefrontCoverUrl } from '@/lib/cover-presets';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import {
  localizeAgendaGroups,
  normalizeSpeakerItems,
  normalizeSponsorItems,
  normalizeSummitStats,
  type AgendaGroup,
  type SpeakerItem,
  type SponsorItem,
  type SummitStat,
  type SummitStatus,
} from '@/lib/summit-content';
import { getAdminMediaAssetStorageKeys } from '@/server/admin/media-assets';
import { db } from '@/server/db';
import { summits, summitTranslations } from '@/server/db/schema';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';

export type StorefrontSpeakerItem = {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  expertise: string;
  region: string;
  badgeText: string;
  description: string;
};

export type StorefrontSponsorItem = {
  id: string;
  tier: 'diamond' | 'gold' | 'silver';
  name: string;
  logo: string;
  badgeText: string;
  intro: string;
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
  videoUrl: string;
  backgroundImage: string;
  backgroundSolidCss: string;
  showCoverOnBackground: boolean;
  stats: SummitStat[];
  venueImage: string;
  address: string;
  transportation: string;
  speakers: StorefrontSpeakerItem[];
  sponsors: StorefrontSponsorItem[];
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

function collectSummitUploadIds(rows: Array<typeof summits.$inferSelect>): string[] {
  const ids: string[] = [];
  for (const row of rows) {
    if (row.coverMode === 'upload' && row.coverValue) ids.push(row.coverValue);
    if (row.backgroundMode === 'upload' && row.backgroundValue) ids.push(row.backgroundValue);
  }
  return ids;
}

function mapSpeakers(speakers: SpeakerItem[]): StorefrontSpeakerItem[] {
  return normalizeSpeakerItems(speakers).map((speaker) => ({
    id: speaker.id,
    name: speaker.name,
    avatar: resolveOssAssetUrl(speaker.avatar),
    bio: speaker.bio,
    expertise: speaker.expertise,
    region: speaker.region ?? '',
    badgeText: speaker.badgeText ?? '',
    description: rewriteHtmlOssAssets(speaker.description ?? '', 'toPublicUrl'),
  }));
}

function mapSponsors(sponsors: SponsorItem[]): StorefrontSponsorItem[] {
  return normalizeSponsorItems(sponsors).map((sponsor) => ({
    id: sponsor.id,
    tier: sponsor.tier,
    name: sponsor.name,
    logo: resolveOssAssetUrl(sponsor.logo),
    badgeText: sponsor.badgeText,
    intro: sponsor.intro,
  }));
}

function mapToItem(
  row: typeof summits.$inferSelect,
  t: typeof summitTranslations.$inferSelect | null | undefined,
  uploadKeyById?: Map<string, string>,
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
      uploadKeyById,
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
  const uploadKeyById = await getAdminMediaAssetStorageKeys(collectSummitUploadIds(rows));

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
    const item = mapToItem(row, display, uploadKeyById);

    if (row.status === 'completed') {
      completed.push(item);
    } else {
      upcoming.push(item);
    }
  }

  upcoming.sort((a, b) => {
    const statusOrder: Record<string, number> = { registering: 0, upcoming: 1 };
    const so = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
    if (so !== 0) return so;
    if (!a.startDate && !b.startDate) return 0;
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

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
  const uploadKeyById = await getAdminMediaAssetStorageKeys(collectSummitUploadIds([row]));

  let uploadUrl = '';
  if (row.backgroundMode === 'upload' && row.backgroundValue) {
    const key = uploadKeyById.get(row.backgroundValue);
    uploadUrl = key ? resolveOssAssetUrl(key) : '';
  }

  const bg = resolvePartnerCenterBackgroundDisplay({
    mode: row.backgroundMode ?? '',
    value: row.backgroundValue ?? '',
    uploadUrl,
    legacyBackgroundImage: row.backgroundImage ? resolveOssAssetUrl(row.backgroundImage) : '',
    fallbackSolidWhenEmpty: false,
  });
  const useDefaultSolidHero = row.backgroundMode === 'solid';

  return {
    ...mapToItem(row, display, uploadKeyById),
    videoUrl: row.videoUrl?.trim() ? resolveOssAssetUrl(row.videoUrl) : '',
    backgroundImage: useDefaultSolidHero ? '' : bg.imageUrl,
    backgroundSolidCss: '',
    showCoverOnBackground: Boolean(row.showCoverOnBackground),
    stats: normalizeSummitStats(display?.stats as Array<{ label?: string; value?: string }>),
    venueImage: resolveOssAssetUrl(row.venueImage),
    address: display?.address ?? '',
    transportation: display?.transportation ?? '',
    speakers: mapSpeakers((display?.speakers ?? []) as SpeakerItem[]),
    sponsors: mapSponsors((display?.sponsors ?? []) as SponsorItem[]),
    agenda: localizeAgendaGroups((row.agenda ?? []) as AgendaGroup[], input.locale),
  };
}

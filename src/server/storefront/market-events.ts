import 'server-only';

import { asc, eq, inArray } from 'drizzle-orm';

import { resolvePartnerCenterBackgroundDisplay } from '@/lib/partner-center-background-presets';
import { rewriteHtmlOssAssets, resolveOssAssetUrl } from '@/lib/oss-asset-url';
import { resolveStorefrontCoverUrl } from '@/lib/cover-presets';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { resolveUploadStorageKey } from '@/lib/upload-storage-key';
import { resolveStorefrontHeroCopyStyle, type HeroCopyStyle } from '@/lib/hero-copy-style';
import { resolveStorefrontHeroCoverDisplay } from '@/lib/hero-cover-display';
import {
  localizeAgendaGroups,
  normalizeSpeakerItems,
  normalizeSponsorItems,
  normalizeMarketEventStats,
  type AgendaGroup,
  type SpeakerItem,
  type SponsorItem,
  type MarketEventStat,
  type MarketEventStatus,
} from '@/lib/market-event-content';
import { db } from '@/server/db';
import { marketEvents, marketEventTranslations } from '@/server/db/schema';
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

export type StorefrontMarketEventItem = {
  slug: string;
  status: MarketEventStatus;
  startDate: string | null;
  endDate: string | null;
  coverImage: string;
  title: string;
  description: string;
  scale: string;
  duration: string;
  location: string;
};

export type StorefrontMarketEventDetail = StorefrontMarketEventItem & {
  videoUrl: string;
  backgroundImage: string;
  backgroundSolidCss: string;
  showCoverOnBackground: boolean;
  coverDisplay: import('@/lib/hero-cover-display').HeroCoverDisplay;
  heroCopyStyle: HeroCopyStyle;
  detailDescription: string;
  stats: MarketEventStat[];
  venueImage: string;
  address: string;
  transportation: string;
  speakers: StorefrontSpeakerItem[];
  sponsors: StorefrontSponsorItem[];
  agenda: AgendaGroup[];
};

export type StorefrontMarketEventsResponse = {
  locale: string;
  upcoming: StorefrontMarketEventItem[];
  completed: StorefrontMarketEventItem[];
};

function toIso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

function resolveTranslation(
  rows: (typeof marketEventTranslations.$inferSelect)[],
  locale: string,
  defaultLocale: string,
) {
  return rows.find((t) => t.locale.toLowerCase() === locale.toLowerCase())
    ?? pickTranslationForDisplay(rows, defaultLocale);
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
  row: typeof marketEvents.$inferSelect,
  t: typeof marketEventTranslations.$inferSelect | null | undefined,
): StorefrontMarketEventItem {
  return {
    slug: row.slug,
    status: row.status as MarketEventStatus,
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

export async function getStorefrontMarketEventsList(input: { locale: string }): Promise<StorefrontMarketEventsResponse> {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const rows = await db.select().from(marketEvents).orderBy(asc(marketEvents.sortOrder));

  const ids = rows.map((r) => r.id);
  const translations = ids.length
    ? await db.select().from(marketEventTranslations).where(inArray(marketEventTranslations.marketEventId, ids))
    : [];

  const byId = new Map<string, (typeof marketEventTranslations.$inferSelect)[]>();
  for (const t of translations) {
    const b = byId.get(t.marketEventId) ?? [];
    b.push(t);
    byId.set(t.marketEventId, b);
  }

  const upcoming: StorefrontMarketEventItem[] = [];
  const completed: StorefrontMarketEventItem[] = [];

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

export async function getStorefrontMarketEventDetail(input: { slug: string; locale: string }): Promise<StorefrontMarketEventDetail | null> {
  const defaultLocale = await getDefaultSiteLanguageCode();
  const [row] = await db.select().from(marketEvents).where(eq(marketEvents.slug, input.slug)).limit(1);
  if (!row) return null;

  const translations = await db.select().from(marketEventTranslations)
    .where(eq(marketEventTranslations.marketEventId, row.id))
    .orderBy(asc(marketEventTranslations.locale));

  const display = resolveTranslation(translations, input.locale, defaultLocale);

  const bgKey = resolveUploadStorageKey(row.backgroundValue, row.backgroundImage);
  const uploadUrl = bgKey ? resolveOssAssetUrl(bgKey) : '';

  const bg = resolvePartnerCenterBackgroundDisplay({
    mode: row.backgroundMode ?? '',
    value: row.backgroundValue ?? '',
    uploadUrl,
    legacyBackgroundImage: row.backgroundImage ? resolveOssAssetUrl(row.backgroundImage) : '',
    fallbackSolidWhenEmpty: false,
  });
  const useDefaultSolidHero = row.backgroundMode === 'solid';

  return {
    ...mapToItem(row, display),
    videoUrl: row.videoUrl?.trim() ? resolveOssAssetUrl(row.videoUrl) : '',
    backgroundImage: useDefaultSolidHero ? '' : bg.imageUrl,
    backgroundSolidCss: '',
    showCoverOnBackground: Boolean(row.showCoverOnBackground),
    coverDisplay: resolveStorefrontHeroCoverDisplay(row.coverDisplay, false),
    heroCopyStyle: resolveStorefrontHeroCopyStyle(row.heroCopyStyle),
    detailDescription: rewriteHtmlOssAssets(display?.detailDescription ?? '', 'toPublicUrl'),
    stats: normalizeMarketEventStats(display?.stats as Array<{ label?: string; value?: string }>),
    venueImage: resolveOssAssetUrl(row.venueImage),
    address: display?.address ?? '',
    transportation: display?.transportation ?? '',
    speakers: mapSpeakers((display?.speakers ?? []) as SpeakerItem[]),
    sponsors: mapSponsors((display?.sponsors ?? []) as SponsorItem[]),
    agenda: localizeAgendaGroups((row.agenda ?? []) as AgendaGroup[], input.locale),
  };
}

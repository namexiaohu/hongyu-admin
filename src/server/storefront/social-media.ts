import 'server-only';

import { eq } from 'drizzle-orm';

import type { CenterRegion } from '@/lib/partner-center-content';
import {
  type StorefrontSocialMediaProfile,
  compactFeaturedPosts,
  compactOverseasContacts,
  compactSocialChannels,
  regionLabelForLocale,
  type SocialPlatformType,
} from '@/lib/social-media';
import { resolveOssAssetUrl } from '@/lib/oss-asset-url';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { db } from '@/server/db';
import { socialMediaProfileTranslations, socialMediaProfiles } from '@/server/db/schema';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';

export async function getStorefrontSocialMedia(locale: string): Promise<StorefrontSocialMediaProfile> {
  const [row] = await db.select().from(socialMediaProfiles).limit(1);
  const defaultLocale = await getDefaultSiteLanguageCode();

  if (!row) {
    return {
      locale: locale || defaultLocale,
      socialChannels: [],
      overseasContacts: [],
      featuredPosts: [],
    };
  }

  const translations = await db
    .select()
    .from(socialMediaProfileTranslations)
    .where(eq(socialMediaProfileTranslations.profileId, row.id));

  const display = pickTranslationForDisplay(translations, locale)
    ?? pickTranslationForDisplay(translations, defaultLocale);

  const resolvedLocale = display?.locale ?? locale ?? defaultLocale;

  return {
    locale: resolvedLocale,
    socialChannels: compactSocialChannels(row.socialChannels)
      .filter((channel): channel is typeof channel & { type: SocialPlatformType } => Boolean(channel.type))
      .map((channel) => ({
        ...channel,
        qrCode: resolveOssAssetUrl(channel.qrCode),
      })),
    overseasContacts: compactOverseasContacts(row.overseasContacts)
      .filter((contact): contact is typeof contact & { region: CenterRegion } => Boolean(contact.region))
      .map((contact) => ({
        ...contact,
        regionLabel: regionLabelForLocale(contact.region, resolvedLocale),
      })),
    featuredPosts: compactFeaturedPosts(display?.featuredPosts).map((post) => ({
      ...post,
      coverImage: resolveOssAssetUrl(post.coverImage),
    })),
  };
}

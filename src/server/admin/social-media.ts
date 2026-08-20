import 'server-only';

import { and, eq, inArray } from 'drizzle-orm';

import {
  type AdminSocialMediaProfile,
  type AdminSocialMediaPutInput,
  type AdminSocialMediaTranslation,
  adminSocialMediaPutSchema,
  compactFeaturedPosts,
  compactOverseasContacts,
  compactSocialChannels,
  translationHasContent,
} from '@/lib/social-media';
import { shouldPersistLocaleDraft } from '@/lib/locale-draft-persistence';
import { db } from '@/server/db';
import { socialMediaProfileTranslations, socialMediaProfiles } from '@/server/db/schema';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { ensureOssImageKey } from '@/lib/ensure-oss-image-key';

function toIso(value: Date) {
  return value.toISOString();
}

function mapTranslation(row: typeof socialMediaProfileTranslations.$inferSelect): AdminSocialMediaTranslation {
  return {
    id: row.id,
    profileId: row.profileId,
    locale: row.locale,
    featuredPosts: compactFeaturedPosts(row.featuredPosts),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function mapProfile(
  row: typeof socialMediaProfiles.$inferSelect,
  translations: Array<typeof socialMediaProfileTranslations.$inferSelect>,
): AdminSocialMediaProfile {
  return {
    id: row.id,
    socialChannels: compactSocialChannels(row.socialChannels),
    overseasContacts: compactOverseasContacts(row.overseasContacts),
    translations: translations.map(mapTranslation),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

async function ensureSocialMediaProfileRow() {
  const [existing] = await db.select().from(socialMediaProfiles).limit(1);
  if (existing) return existing;

  const [inserted] = await db
    .insert(socialMediaProfiles)
    .values({
      socialChannels: [],
      overseasContacts: [],
    })
    .returning();

  if (!inserted) {
    throw new Error('Failed to create social media profile');
  }

  return inserted;
}

export async function getAdminSocialMedia(): Promise<AdminSocialMediaProfile> {
  const row = await ensureSocialMediaProfileRow();
  const translations = await db
    .select()
    .from(socialMediaProfileTranslations)
    .where(eq(socialMediaProfileTranslations.profileId, row.id));
  return mapProfile(row, translations);
}

export async function updateAdminSocialMedia(input: unknown): Promise<AdminSocialMediaProfile> {
  const parsed: AdminSocialMediaPutInput = adminSocialMediaPutSchema.parse(input);
  const defaultLocale = await getDefaultSiteLanguageCode();
  const row = await ensureSocialMediaProfileRow();

  const socialChannels = await Promise.all(
    compactSocialChannels(parsed.socialChannels).map(async (channel) => ({
      ...channel,
      qrCode: channel.qrCode
        ? await ensureOssImageKey(channel.qrCode, 'social-media/qr')
        : '',
    })),
  );

  const overseasContacts = compactOverseasContacts(parsed.overseasContacts);

  await db
    .update(socialMediaProfiles)
    .set({
      socialChannels,
      overseasContacts,
      updatedAt: new Date(),
    })
    .where(eq(socialMediaProfiles.id, row.id));

  const keepLocales: string[] = [];

  for (const translation of parsed.translations) {
    const persist = shouldPersistLocaleDraft({
      locale: translation.locale,
      defaultLocale,
      primaryText: compactFeaturedPosts(translation.featuredPosts)[0]?.title ?? '',
    }) || (translation.locale !== defaultLocale && translationHasContent(translation));

    if (!persist) continue;
    keepLocales.push(translation.locale);

    const payload = {
      featuredPosts: await Promise.all(
        compactFeaturedPosts(translation.featuredPosts).map(async (post) => ({
          ...post,
          coverImage: post.coverImage
            ? await ensureOssImageKey(post.coverImage, 'social-media/featured')
            : '',
        })),
      ),
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select({ id: socialMediaProfileTranslations.id })
      .from(socialMediaProfileTranslations)
      .where(and(
        eq(socialMediaProfileTranslations.profileId, row.id),
        eq(socialMediaProfileTranslations.locale, translation.locale),
      ))
      .limit(1);

    if (existing) {
      await db
        .update(socialMediaProfileTranslations)
        .set(payload)
        .where(eq(socialMediaProfileTranslations.id, existing.id));
    } else {
      await db.insert(socialMediaProfileTranslations).values({
        profileId: row.id,
        locale: translation.locale,
        ...payload,
      });
    }
  }

  const existingRows = await db
    .select({ id: socialMediaProfileTranslations.id, locale: socialMediaProfileTranslations.locale })
    .from(socialMediaProfileTranslations)
    .where(eq(socialMediaProfileTranslations.profileId, row.id));

  const staleIds = existingRows
    .filter((item) => !keepLocales.includes(item.locale))
    .map((item) => item.id);

  if (staleIds.length) {
    await db.delete(socialMediaProfileTranslations).where(inArray(socialMediaProfileTranslations.id, staleIds));
  }

  return getAdminSocialMedia();
}

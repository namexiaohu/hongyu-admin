import '@/lib/env';

import { eq } from 'drizzle-orm';

import {
  compactFeaturedPosts,
  compactSocialChannels,
  type FeaturedPost,
  type SocialChannel,
} from '@/lib/social-media';
import { db } from '@/server/db';
import { socialMediaProfileTranslations, socialMediaProfiles } from '@/server/db/schema';
import { ensureOssImageKey, isR2ReadyImageValue } from '@/lib/ensure-oss-image-key';

async function migrateChannelQr(channels: SocialChannel[], cache: Map<string, string>) {
  return Promise.all(channels.map(async (channel) => {
    if (!channel.qrCode || isR2ReadyImageValue(channel.qrCode)) {
      return channel;
    }
    const cached = cache.get(channel.qrCode);
    const qrCode = cached ?? await ensureOssImageKey(channel.qrCode, 'social-media/qr');
    cache.set(channel.qrCode, qrCode);
    console.log(`  二维码: ${channel.type || 'unknown'} → ${qrCode}`);
    return { ...channel, qrCode };
  }));
}

async function migrateFeaturedPosts(posts: FeaturedPost[], cache: Map<string, string>) {
  return Promise.all(posts.map(async (post) => {
    if (!post.coverImage || isR2ReadyImageValue(post.coverImage)) {
      return post;
    }
    const cached = cache.get(post.coverImage);
    const coverImage = cached ?? await ensureOssImageKey(post.coverImage, 'social-media/featured');
    cache.set(post.coverImage, coverImage);
    console.log(`  精选封面: ${post.title.slice(0, 40)} → ${coverImage}`);
    return { ...post, coverImage };
  }));
}

async function main() {
  const cache = new Map<string, string>();
  const [row] = await db.select().from(socialMediaProfiles).limit(1);
  if (!row) {
    console.log('无社交媒体数据，跳过。');
    return;
  }

  console.log('迁移社交媒体图片到 R2…');
  const socialChannels = await migrateChannelQr(compactSocialChannels(row.socialChannels), cache);
  await db.update(socialMediaProfiles).set({
    socialChannels,
    updatedAt: new Date(),
  }).where(eq(socialMediaProfiles.id, row.id));

  const translations = await db
    .select()
    .from(socialMediaProfileTranslations)
    .where(eq(socialMediaProfileTranslations.profileId, row.id));

  for (const translation of translations) {
    const featuredPosts = await migrateFeaturedPosts(compactFeaturedPosts(translation.featuredPosts), cache);
    await db.update(socialMediaProfileTranslations).set({
      featuredPosts,
      updatedAt: new Date(),
    }).where(eq(socialMediaProfileTranslations.id, translation.id));
  }

  console.log('社交媒体图片迁移完成。');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

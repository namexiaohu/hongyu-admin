import '@/lib/env';

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { and, eq } from 'drizzle-orm';

import { SUMMIT_SEED_RECORDS, type SummitSeedRecord } from '@/lib/summit-seed-data';
import {
  getSummitSeedProfile,
  type SummitSeedLocaleProfile,
  type SummitSeedSpeakerSeed,
  type SummitSeedSponsorSeed,
} from '@/lib/summit-seed-profiles';
import type { AgendaGroup, SpeakerItem, SponsorItem } from '@/lib/summit-content';
import { getCoverImagePreset } from '@/lib/cover-presets';
import { db } from '@/server/db';
import { summits, summitTranslations } from '@/server/db/schema';
import { putStorageObject } from '@/server/oss';

const forceRefresh = process.argv.includes('--force');
const seedAssetsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'seed-assets');

type PexelsVideoFile = {
  quality: string;
  file_type: string;
  width: number;
  height: number;
  link: string;
};

type PexelsVideo = {
  id: number;
  url: string;
  duration: number;
  video_files: PexelsVideoFile[];
};

async function downloadBuffer(url: string, referer?: string) {
  const headers: Record<string, string> = { 'user-agent': 'Mozilla/5.0 (compatible; hongyu-summits-seed/1.0)' };
  if (referer) headers.referer = referer;
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`Download failed ${r.status}: ${url}`);
  return {
    buffer: Buffer.from(await r.arrayBuffer()),
    contentType: r.headers.get('content-type') ?? '',
  };
}

function pickMp4(files: PexelsVideoFile[]) {
  const mp4s = files.filter((f) => f.file_type === 'video/mp4' && f.link);
  if (!mp4s.length) return null;
  const ranked = [...mp4s].sort((a, b) => {
    const score = (f: PexelsVideoFile) => {
      const h = f.height;
      if (h >= 700 && h <= 1080) return 1000 - Math.abs(1080 - h);
      if (h > 1080 && h <= 1440) return 500 - (h - 1080);
      return h;
    };
    return score(b) - score(a);
  });
  return ranked[0] ?? null;
}

async function fetchPexelsVideo(apiKey: string, videoId: string): Promise<PexelsVideo> {
  const response = await fetch(`https://api.pexels.com/v1/videos/videos/${videoId}`, {
    headers: { Authorization: apiKey },
  });
  if (!response.ok) {
    throw new Error(`Pexels get video failed: ${response.status} ${await response.text()}`);
  }
  return response.json() as Promise<PexelsVideo>;
}

async function uploadImageFromLocal(slug: string, role: string, relativePath: string, cache?: Map<string, string>) {
  const cacheKey = `${slug}:local:${role}:${relativePath}`;
  if (cache?.has(cacheKey)) return cache.get(cacheKey)!;

  const buffer = await readFile(path.join(seedAssetsDir, relativePath));
  const ext = relativePath.endsWith('.png') ? 'png' : 'jpg';
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
  const key = `summits/${slug}/${role}.${ext}`;
  console.log(`  上传 ${role} (local): ${slug} → ${key}`);
  const result = await putStorageObject(key, buffer, mime);
  if (!result.ok) throw new Error(result.error);
  cache?.set(cacheKey, result.key);
  return result.key;
}
async function uploadImage(slug: string, role: string, url: string, cache?: Map<string, string>) {
  const cacheKey = `${slug}:${role}:${url}`;
  if (cache?.has(cacheKey)) return cache.get(cacheKey)!;

  const { buffer, contentType } = await downloadBuffer(url);
  const ext = contentType.includes('png') ? 'png' : 'jpg';
  const mime = contentType.includes('png') ? 'image/png' : 'image/jpeg';
  const key = `summits/${slug}/${role}.${ext}`;
  console.log(`  上传 ${role}: ${slug} → ${key}`);
  const result = await putStorageObject(key, buffer, mime);
  if (!result.ok) throw new Error(result.error);
  cache?.set(cacheKey, result.key);
  return result.key;
}

async function uploadVideoFromLocal(slug: string, filename: string) {
  const key = `summits/${slug}/hero.mp4`;
  console.log(`  上传 video (local): ${slug} → ${key}`);
  const buffer = await readFile(path.join(seedAssetsDir, filename));
  const result = await putStorageObject(key, buffer, 'video/mp4');
  if (!result.ok) throw new Error(result.error);
  return result.key;
}

async function uploadVideoFromUrl(slug: string, url: string, referer?: string) {
  const key = `summits/${slug}/hero.mp4`;
  console.log(`  上传 video: ${slug} → ${key}`);
  const { buffer } = await downloadBuffer(url, referer);
  const result = await putStorageObject(key, buffer, 'video/mp4');
  if (!result.ok) throw new Error(result.error);
  return result.key;
}

async function uploadVideoFromPexels(slug: string, videoId: string) {
  const apiKey = process.env.PEXELS_API_KEY?.trim();
  if (!apiKey) throw new Error(`Summit ${slug} 需要 PEXELS_API_KEY 下载 video id=${videoId}`);
  const video = await fetchPexelsVideo(apiKey, videoId);
  const file = pickMp4(video.video_files);
  if (!file) throw new Error(`Pexels video ${videoId} 未返回可用 mp4`);
  return uploadVideoFromUrl(slug, file.link, 'https://www.pexels.com/');
}

async function uploadSpeakerAvatars(slug: string, speakers: SummitSeedSpeakerSeed[], cache: Map<string, string>): Promise<SpeakerItem[]> {
  const out: SpeakerItem[] = [];
  for (const speaker of speakers) {
    const avatarKey = await uploadImage(slug, `speakers/${speaker.id}`, speaker.avatarUrl, cache);
    const { avatarUrl: _drop, ...rest } = speaker;
    out.push({ ...rest, avatar: avatarKey });
  }
  return out;
}

async function uploadSponsorLogos(slug: string, sponsors: SummitSeedSponsorSeed[], cache: Map<string, string>): Promise<SponsorItem[]> {
  const out: SponsorItem[] = [];
  for (const sponsor of sponsors) {
    let logoKey: string;
    if (sponsor.logoLocalAsset) {
      logoKey = await uploadImageFromLocal(slug, `sponsors/${sponsor.id}`, sponsor.logoLocalAsset, cache);
    } else if (sponsor.logoUrl) {
      logoKey = await uploadImage(slug, `sponsors/${sponsor.id}`, sponsor.logoUrl, cache);
    } else {
      throw new Error(`Sponsor ${sponsor.id} 缺少 logoUrl 或 logoLocalAsset`);
    }
    const { logoUrl: _u, logoLocalAsset: _l, ...rest } = sponsor;
    out.push({ ...rest, logo: logoKey });
  }
  return out;
}

async function resolveCoverKeys(record: SummitSeedRecord, profile: NonNullable<ReturnType<typeof getSummitSeedProfile>>) {
  if (profile.coverMode === 'preset' && profile.coverPresetId) {
    const preset = getCoverImagePreset(profile.coverPresetId);
    if (!preset) throw new Error(`Unknown cover preset: ${profile.coverPresetId}`);
    const coverKey = await uploadImage(record.slug, 'cover', preset.fullUrl);
    return {
      coverImage: coverKey,
      coverMode: 'preset' as const,
      coverValue: profile.coverPresetId,
    };
  }
  const coverKey = await uploadImage(record.slug, 'cover', record.coverImageUrl);
  return {
    coverImage: coverKey,
    coverMode: 'upload' as const,
    coverValue: coverKey,
  };
}

async function prepareLocaleData(slug: string, localeProfile: SummitSeedLocaleProfile, cache: Map<string, string>) {
  const speakers = await uploadSpeakerAvatars(slug, localeProfile.speakers, cache);
  const sponsors = await uploadSponsorLogos(slug, localeProfile.sponsors, cache);
  return {
    stats: localeProfile.stats,
    speakers,
    sponsors,
  };
}

async function upsertSummit(
  record: SummitSeedRecord,
  venueKey: string,
  cover: { coverImage: string; coverMode: 'preset' | 'upload'; coverValue: string },
  videoKey: string,
  profile: NonNullable<ReturnType<typeof getSummitSeedProfile>>,
  localeData: Record<string, Awaited<ReturnType<typeof prepareLocaleData>>>,
) {
  const now = new Date();
  const [existing] = await db.select({ id: summits.id }).from(summits).where(eq(summits.slug, record.slug)).limit(1);
  let summitId = existing?.id;

  const summitValues = {
    status: record.status,
    startDate: new Date(record.startDate),
    endDate: new Date(record.endDate),
    coverImage: cover.coverImage,
    coverMode: cover.coverMode,
    coverValue: cover.coverValue,
    videoUrl: videoKey,
    backgroundMode: profile.backgroundMode,
    backgroundValue: profile.backgroundValue,
    showCoverOnBackground: profile.showCoverOnBackground,
    venueImage: venueKey,
    agenda: record.agenda as AgendaGroup[],
    sortOrder: record.sortOrder,
    updatedAt: now,
  };

  if (existing) {
    if (!forceRefresh) {
      console.log(`  跳过已存在: ${record.slug}（使用 --force 强制刷新）`);
      return;
    }
    await db.update(summits).set(summitValues).where(eq(summits.id, existing.id));
  } else {
    const [inserted] = await db.insert(summits).values({
      slug: record.slug,
      ...summitValues,
    }).returning({ id: summits.id });
    summitId = inserted.id;
  }

  if (!summitId) throw new Error(`Failed to upsert ${record.slug}`);

  for (const [locale, data] of Object.entries(record.i18n)) {
    const extended = localeData[locale];
    if (!extended) throw new Error(`Missing locale profile for ${record.slug}/${locale}`);

    const [existT] = await db.select({ id: summitTranslations.id }).from(summitTranslations)
      .where(and(eq(summitTranslations.summitId, summitId), eq(summitTranslations.locale, locale))).limit(1);

    const values = {
      title: data.title,
      description: data.description,
      scale: data.scale,
      duration: data.duration,
      location: data.location,
      address: data.address,
      transportation: data.transportation,
      stats: extended.stats,
      speakers: extended.speakers,
      sponsors: extended.sponsors,
      updatedAt: now,
    };

    if (existT) {
      await db.update(summitTranslations).set(values).where(eq(summitTranslations.id, existT.id));
    } else {
      await db.insert(summitTranslations).values({ summitId, locale, ...values });
    }
  }
}

async function main() {
  for (const record of SUMMIT_SEED_RECORDS) {
    console.log(`\n处理行业峰会: ${record.slug}`);
    const profile = getSummitSeedProfile(record.slug);
    if (!profile) {
      throw new Error(`缺少 seed profile: ${record.slug}`);
    }

    const cover = await resolveCoverKeys(record, profile);
    const venueKey = await uploadImage(record.slug, 'venue', record.venueImageUrl);

    let videoKey = '';
    if (profile.videoLocalAsset) {
      videoKey = await uploadVideoFromLocal(record.slug, profile.videoLocalAsset);
    } else if (profile.videoPexelsId) {
      videoKey = await uploadVideoFromPexels(record.slug, profile.videoPexelsId);
    } else if (profile.videoDownloadUrl) {
      videoKey = await uploadVideoFromUrl(record.slug, profile.videoDownloadUrl);
    }

    const assetCache = new Map<string, string>();
    const localeData: Record<string, Awaited<ReturnType<typeof prepareLocaleData>>> = {};
    for (const locale of Object.keys(record.i18n)) {
      const localeProfile = profile.i18n[locale];
      if (!localeProfile) {
        throw new Error(`Profile 缺少 locale ${record.slug}/${locale}`);
      }
      localeData[locale] = await prepareLocaleData(record.slug, localeProfile, assetCache);
    }

    await upsertSummit(record, venueKey, cover, videoKey, profile, localeData);
    console.log(`  已写入: ${record.slug}`);
  }
  console.log('\n行业峰会种子数据完成。');
}

main().catch((e) => { console.error(e); process.exit(1); });

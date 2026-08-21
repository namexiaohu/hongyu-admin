import '@/lib/env';

import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { and, eq } from 'drizzle-orm';

import type { AdminProductPayload } from '@/lib/product-content';
import { db } from '@/server/db';
import { productTranslations, products } from '@/server/db/schema';
import { putStorageObject } from '@/server/oss';

const SLUG = 'v-clamp-100';
const LOCALE = 'en';
const R2_KEY = `products/videos/${SLUG}-demo.mp4`;
const PEXELS_QUERY = process.env.PEXELS_VIDEO_QUERY ?? 'medical surgical instruments';
const PEXELS_VIDEO_ID = process.env.PEXELS_VIDEO_ID ?? '6130554'; // close-up medical tools, ~7s 1080p

type PexelsVideoFile = {
  id: number;
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

function pickMp4(files: PexelsVideoFile[]) {
  const mp4s = files.filter((f) => f.file_type === 'video/mp4' && f.link);
  if (!mp4s.length) return null;

  // Prefer ~720–1080p landscape to keep upload small
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

async function downloadBuffer(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function main() {
  const apiKey = process.env.PEXELS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('缺少 PEXELS_API_KEY');
  }

  console.log(`Pexels video id=${PEXELS_VIDEO_ID} (query hint: ${PEXELS_QUERY})`);
  const video = await fetchPexelsVideo(apiKey, PEXELS_VIDEO_ID);
  const file = pickMp4(video.video_files);
  if (!file) {
    throw new Error('Pexels 未返回可用 mp4');
  }

  console.log(`选用 ${file.quality} ${file.width}x${file.height} · ${video.duration}s`);
  console.log(`来源: ${video.url}`);

  const buffer = await downloadBuffer(file.link);
  console.log(`已下载 ${Math.round(buffer.length / 1024)} KB`);

  const cachePath = path.resolve(process.cwd(), '.tmp', `${SLUG}-pexels-${video.id}.mp4`);
  await writeFile(cachePath, buffer).catch(() => undefined);

  const uploaded = await putStorageObject(R2_KEY, buffer, 'video/mp4');
  if (!uploaded.ok) {
    throw new Error(uploaded.error || 'R2 upload failed');
  }
  console.log(`已上传 R2: ${uploaded.key}`);
  console.log(`公开 URL: ${uploaded.url}`);

  const [row] = await db
    .select({
      id: productTranslations.id,
      payload: productTranslations.payload,
    })
    .from(productTranslations)
    .innerJoin(products, eq(products.id, productTranslations.productId))
    .where(and(
      eq(productTranslations.slug, SLUG),
      eq(productTranslations.locale, LOCALE),
      eq(products.status, 'active'),
    ))
    .limit(1);

  if (!row) {
    throw new Error(`未找到产品 ${SLUG} (${LOCALE})`);
  }

  const prev = row.payload ?? {};
  const nextPayload: AdminProductPayload = {
    coverUrl: prev.coverUrl ?? null,
    coverAlt: prev.coverAlt ?? null,
    videoUrl: uploaded.key,
    gallery: prev.gallery ?? [],
    tags: prev.tags ?? [],
    attachments: prev.attachments ?? [],
    certifications: prev.certifications ?? [],
  };

  await db
    .update(productTranslations)
    .set({
      payload: nextPayload,
      updatedAt: new Date(),
    })
    .where(eq(productTranslations.id, row.id));

  console.log(`已写入 ${SLUG} / ${LOCALE} payload.videoUrl = ${uploaded.key}`);
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});

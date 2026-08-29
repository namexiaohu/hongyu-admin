/**
 * Search Pexels for short medical/education videos, download MP4 ≤100MB, upload to R2.
 * Writes scripts/data/academy-lesson-videos.json for seed-academy-outline.ts
 *
 * Usage:
 *   set PEXELS_API_KEY=xxx   # PowerShell: $env:PEXELS_API_KEY='xxx'
 *   pnpm exec tsx scripts/upload-academy-lesson-videos.ts
 *
 * Key is only needed for this one-off seed script, not app runtime.
 */
import '@/lib/env';

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const MAX_BYTES = 100 * 1024 * 1024;
const VIDEO_COUNT = 12;
const SEARCH_QUERIES = [
  'veterinary clinic',
  'doctor medical',
  'surgery hospital',
  'laboratory science',
  'pet dog veterinary',
  'ultrasound medical',
];

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
  duration: number;
  video_files: PexelsVideoFile[];
};

type ManifestItem = {
  key: string;
  pexelsId: number;
  durationSeconds: number;
  bytes: number;
};

function getR2Client() {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const accessKeySecret = process.env.R2_ACCESS_KEY_SECRET;
  const bucket = process.env.R2_BUCKET;
  const endpoint = process.env.R2_ENDPOINT;
  const region = process.env.R2_REGION || 'auto';
  if (!accessKeyId || !accessKeySecret || !bucket || !endpoint) {
    throw new Error('R2 env vars missing');
  }
  return {
    client: new S3Client({
      region,
      endpoint,
      credentials: { accessKeyId, secretAccessKey: accessKeySecret },
      forcePathStyle: true,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    }),
    bucket,
  };
}

function pickMp4File(files: PexelsVideoFile[]): PexelsVideoFile | null {
  const mp4 = files.filter((file) => file.file_type === 'video/mp4' && file.link);
  if (!mp4.length) return null;
  const ranked = [...mp4].sort((a, b) => {
    const score = (file: PexelsVideoFile) => {
      if (file.quality === 'sd') return 0;
      if (file.height && file.height <= 720) return 1;
      if (file.quality === 'hd') return 2;
      return 3;
    };
    return score(a) - score(b) || a.width - b.width;
  });
  return ranked[0] ?? null;
}

async function contentLength(url: string): Promise<number | null> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const value = response.headers.get('content-length');
    if (!value) return null;
    const size = Number(value);
    return Number.isFinite(size) ? size : null;
  } catch {
    return null;
  }
}

async function searchVideos(apiKey: string, query: string, page: number): Promise<PexelsVideo[]> {
  const url = new URL('https://api.pexels.com/videos/search');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '15');
  url.searchParams.set('page', String(page));
  url.searchParams.set('orientation', 'landscape');
  url.searchParams.set('size', 'medium');
  const response = await fetch(url, {
    headers: { Authorization: apiKey },
  });
  if (!response.ok) {
    throw new Error(`Pexels search failed (${response.status})`);
  }
  const payload = (await response.json()) as { videos?: PexelsVideo[] };
  return payload.videos ?? [];
}

async function main() {
  const apiKey = process.env.PEXELS_API_KEY?.trim();
  if (!apiKey) throw new Error('PEXELS_API_KEY is required');

  const { client, bucket } = getR2Client();
  const seen = new Set<number>();
  const candidates: Array<{ video: PexelsVideo; file: PexelsVideoFile }> = [];

  for (const query of SEARCH_QUERIES) {
    if (candidates.length >= VIDEO_COUNT * 2) break;
    const videos = await searchVideos(apiKey, query, 1);
    for (const video of videos) {
      if (seen.has(video.id) || !video.duration || video.duration > 90) continue;
      const file = pickMp4File(video.video_files ?? []);
      if (!file) continue;
      const size = await contentLength(file.link);
      if (size != null && size > MAX_BYTES) continue;
      seen.add(video.id);
      candidates.push({ video, file });
    }
  }

  if (!candidates.length) throw new Error('No suitable Pexels videos found');

  const manifest: ManifestItem[] = [];
  for (const [index, candidate] of candidates.slice(0, VIDEO_COUNT).entries()) {
    const key = `academy/lessons/pool/video-${String(index + 1).padStart(2, '0')}-${candidate.video.id}.mp4`;
    console.log(`[lesson-videos] Downloading #${candidate.video.id}…`);
    const response = await fetch(candidate.file.link);
    if (!response.ok) {
      console.warn(`[lesson-videos] Skip download failed ${candidate.video.id}`);
      continue;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_BYTES) {
      console.warn(`[lesson-videos] Skip oversized ${candidate.video.id} (${buffer.length})`);
      continue;
    }
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: 'video/mp4',
      CacheControl: 'public, max-age=31536000, immutable',
    }));
    manifest.push({
      key,
      pexelsId: candidate.video.id,
      durationSeconds: Math.round(candidate.video.duration),
      bytes: buffer.length,
    });
    console.log(`[lesson-videos] Uploaded ${key} (${Math.round(buffer.length / 1024 / 1024)}MB, ${candidate.video.duration}s)`);
  }

  if (!manifest.length) throw new Error('No videos uploaded');

  const dataDir = path.join(process.cwd(), 'scripts', 'data');
  await mkdir(dataDir, { recursive: true });
  const outPath = path.join(dataDir, 'academy-lesson-videos.json');
  await writeFile(outPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`[lesson-videos] Wrote ${manifest.length} items → ${outPath}`);
}

main().catch((error) => {
  console.error('[lesson-videos] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});

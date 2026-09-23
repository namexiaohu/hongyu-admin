/**
 * Cloudflare R2 file upload service (S3-compatible).
 *
 * SERVER-ONLY MODULE: must never be imported into client-side components.
 */

import 'server-only';

import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { getPublicOssDomain } from '@/lib/oss-asset-url';

type UploadResult =
  | { ok: true; url: string; key: string }
  | { ok: false; error: string };

type UploadInput = {
  buffer: Buffer;
  filename: string;
  contentType?: string;
  folder?: string;
};

type PresignPutResult =
  | { ok: true; uploadUrl: string; url: string; key: string }
  | { ok: false; error: string };

const DEFAULT_PRESIGN_EXPIRES_SECONDS = 15 * 60;

function getR2Config() {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const accessKeySecret = process.env.R2_ACCESS_KEY_SECRET;
  const bucket = process.env.R2_BUCKET;
  const endpoint = process.env.R2_ENDPOINT;
  const region = process.env.R2_REGION || 'auto';
  const domain = getPublicOssDomain();

  if (!accessKeyId || !accessKeySecret || !bucket || !endpoint) {
    return null;
  }

  return { accessKeyId, accessKeySecret, bucket, endpoint, region, domain };
}

function createR2Client(config: NonNullable<ReturnType<typeof getR2Config>>) {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.accessKeySecret,
    },
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
}

export function buildObjectKey(folder: string, filename: string) {
  const ext = path.extname(filename) || '.jpg';
  const normalizedFolder = folder.replace(/^\/+|\/+$/g, '') || 'uploads';
  return `${normalizedFolder}/${randomUUID()}${ext}`;
}

export function getPublicObjectUrl(key: string): string | null {
  const domain = getPublicOssDomain();
  const normalized = key.replace(/^\//, '').trim();
  if (!domain || !normalized) return null;
  return `${domain}/${normalized}`;
}

export async function putStorageObject(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<UploadResult> {
  const config = getR2Config();
  if (!config) {
    return { ok: false, error: 'Cloudflare R2 not configured' };
  }

  try {
    const client = createR2Client(config);
    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }));

    const url = config.domain ? `${config.domain}/${key}` : key;
    return { ok: true, url, key };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[r2] Upload failed:', message);
    return { ok: false, error: message };
  }
}

export async function uploadToOss(input: UploadInput): Promise<UploadResult> {
  const folder = input.folder ?? 'uploads';
  const key = buildObjectKey(folder, input.filename);
  const ext = path.extname(input.filename) || '.jpg';
  return putStorageObject(key, input.buffer, input.contentType ?? getMimeType(ext));
}

export async function presignPutObject(input: {
  key: string;
  contentType: string;
  expiresIn?: number;
}): Promise<PresignPutResult> {
  const config = getR2Config();
  if (!config) {
    return { ok: false, error: 'Cloudflare R2 not configured' };
  }

  try {
    const client = createR2Client(config);
    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: input.key,
      ContentType: input.contentType,
    });
    const uploadUrl = await getSignedUrl(client, command, {
      expiresIn: input.expiresIn ?? DEFAULT_PRESIGN_EXPIRES_SECONDS,
    });
    const url = config.domain ? `${config.domain}/${input.key}` : input.key;
    return { ok: true, uploadUrl, url, key: input.key };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[r2] Presign failed:', message);
    return { ok: false, error: message };
  }
}

export async function deleteFromOss(key: string): Promise<{ ok: boolean; error?: string }> {
  const config = getR2Config();
  if (!config) return { ok: false, error: 'Cloudflare R2 not configured' };

  try {
    const client = createR2Client(config);
    await client.send(new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }));
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[r2] Delete failed:', message);
    return { ok: false, error: message };
  }
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return map[ext.toLowerCase()] ?? 'application/octet-stream';
}

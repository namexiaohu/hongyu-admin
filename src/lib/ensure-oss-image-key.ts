import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { getPublicOssDomain, isOssCdnUrl, toOssStorageKey } from '@/lib/oss-asset-url';
import { putStorageObject, uploadToOss } from '@/server/oss';

const WEB_PUBLIC_DIR = path.resolve(process.cwd(), '..', 'hongyu-web', 'public');
const SITE_ORIGIN = (process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:5000').replace(/\/$/, '');

const LOCAL_PUBLIC_PATH = /^\/(images|hero|media|files)\//i;

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function isLocalPublicPath(value: string) {
  return LOCAL_PUBLIC_PATH.test(value) || value.startsWith('/images/');
}

function looksLikeStoredKey(value: string) {
  const trimmed = value.trim();
  if (!trimmed || isHttpUrl(trimmed) || trimmed.startsWith('data:')) return false;
  return !isLocalPublicPath(trimmed);
}

function mimeFromExtension(ext: string) {
  switch (ext.toLowerCase()) {
    case '.png': return 'image/png';
    case '.webp': return 'image/webp';
    case '.gif': return 'image/gif';
    case '.svg': return 'image/svg+xml';
    case '.mp4': return 'video/mp4';
    case '.webm': return 'video/webm';
    case '.mov': return 'video/quicktime';
    case '.avi': return 'video/x-msvideo';
    default: return 'image/jpeg';
  }
}

async function loadImageBuffer(source: string) {
  if (source.startsWith('/')) {
    const filePath = path.join(WEB_PUBLIC_DIR, source.replace(/^\//, ''));
    try {
      const buffer = await readFile(filePath);
      const ext = path.extname(filePath) || '.jpg';
      return { buffer, filename: path.basename(filePath), contentType: mimeFromExtension(ext) };
    } catch {
      const response = await fetch(`${SITE_ORIGIN}${source}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      const ext = path.extname(source) || '.jpg';
      return { buffer, filename: path.basename(source), contentType: mimeFromExtension(ext) };
    }
  }

  const response = await fetch(source, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; hongyu-oss/1.0)' },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const ext = path.extname(new URL(source).pathname) || '.jpg';
  return {
    buffer,
    filename: path.basename(new URL(source).pathname) || `image${ext}`,
    contentType: response.headers.get('content-type') ?? mimeFromExtension(ext),
  };
}

/** 本地路径 / 外链 → R2 key；已是 key 则原样返回。支持图片与视频。 */
export async function ensureOssImageKey(value: string, folder: string): Promise<string> {
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (looksLikeStoredKey(trimmed)) {
    return trimmed.replace(/^\//, '');
  }

  if (isOssCdnUrl(trimmed)) {
    return toOssStorageKey(trimmed);
  }

  const normalized = toOssStorageKey(trimmed);
  if (normalized && looksLikeStoredKey(normalized)) {
    return normalized.replace(/^\//, '');
  }

  if (isLocalPublicPath(trimmed) || isHttpUrl(trimmed)) {
    const { buffer, filename, contentType } = await loadImageBuffer(trimmed);
    const ext = path.extname(filename) || '.jpg';
    const key = `${folder}/${filename.replace(/[^\w.-]+/g, '-') || `asset${ext}`}`;
    const result = await putStorageObject(key, buffer, contentType);
    if (!result.ok) {
      const fallback = await uploadToOss({ buffer, filename, contentType, folder });
      if (!fallback.ok) throw new Error(fallback.error);
      return fallback.key;
    }
    return result.key;
  }

  return trimmed.replace(/^\//, '');
}

/** @deprecated alias — 与 ensureOssImageKey 相同，可处理视频。 */
export const ensureOssMediaKey = ensureOssImageKey;

export function isR2ReadyImageValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (isLocalPublicPath(trimmed)) return false;
  if (isHttpUrl(trimmed) && !isOssCdnUrl(trimmed)) {
    const domain = getPublicOssDomain();
    if (!domain) return false;
    try {
      return new URL(trimmed).host === new URL(domain).host;
    } catch {
      return false;
    }
  }
  return looksLikeStoredKey(trimmed) || isOssCdnUrl(trimmed);
}

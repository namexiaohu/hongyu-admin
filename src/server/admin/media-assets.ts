import 'server-only';

import { desc, eq, inArray } from 'drizzle-orm';

import { resolveOssAssetUrl } from '@/lib/oss-asset-url';
import type { AdminMediaAsset, MediaAssetType } from '@/lib/media-assets';
import { MEDIA_ASSET_TYPES } from '@/lib/media-assets';
import { db } from '@/server/db';
import { mediaAssets } from '@/server/db/schema';
import { uploadToOss } from '@/server/oss';

function toIso(value: Date) {
  return value.toISOString();
}

function mapAsset(row: typeof mediaAssets.$inferSelect): AdminMediaAsset {
  return {
    id: row.id,
    type: row.type,
    storageKey: row.storageKey,
    filename: row.filename,
    contentType: row.contentType,
    byteSize: row.byteSize,
    url: resolveOssAssetUrl(row.storageKey),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export function isMediaAssetType(value: string): value is MediaAssetType {
  return (MEDIA_ASSET_TYPES as readonly string[]).includes(value);
}

export async function listAdminMediaAssets(type: string): Promise<AdminMediaAsset[]> {
  const rows = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.type, type))
    .orderBy(desc(mediaAssets.createdAt));
  return rows.map(mapAsset);
}

export async function getAdminMediaAssetById(id: string): Promise<AdminMediaAsset | null> {
  const [row] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
  return row ? mapAsset(row) : null;
}

export async function getAdminMediaAssetStorageKeys(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map<string, string>();
  const rows = await db
    .select({ id: mediaAssets.id, storageKey: mediaAssets.storageKey })
    .from(mediaAssets)
    .where(inArray(mediaAssets.id, unique));
  const map = new Map<string, string>();
  for (const row of rows) map.set(row.id, row.storageKey);
  return map;
}

const FOLDER_BY_TYPE: Record<string, string> = {
  partner_center_background: 'partner-centers/backgrounds',
  brand_narrative_background: 'brand-narratives/backgrounds',
  solution_background: 'solutions/backgrounds',
};

export async function createAdminMediaAssetFromUpload(input: {
  type: string;
  buffer: Buffer;
  filename: string;
  contentType: string;
  byteSize: number;
}) {
  if (!isMediaAssetType(input.type)) {
    throw new Error('INVALID_TYPE');
  }

  const folder = FOLDER_BY_TYPE[input.type] ?? 'uploads';
  const uploaded = await uploadToOss({
    buffer: input.buffer,
    filename: input.filename,
    contentType: input.contentType,
    folder,
  });

  if (!uploaded.ok) {
    throw new Error(uploaded.error || 'UPLOAD_FAILED');
  }

  const [inserted] = await db
    .insert(mediaAssets)
    .values({
      type: input.type,
      storageKey: uploaded.key,
      filename: input.filename,
      contentType: input.contentType,
      byteSize: input.byteSize,
    })
    .returning();

  return mapAsset(inserted);
}

export async function createAdminMediaAssetFromKey(input: {
  type: string;
  storageKey: string;
  filename?: string;
  contentType?: string;
  byteSize?: number;
}) {
  if (!isMediaAssetType(input.type)) {
    throw new Error('INVALID_TYPE');
  }
  const [inserted] = await db
    .insert(mediaAssets)
    .values({
      type: input.type,
      storageKey: input.storageKey,
      filename: input.filename ?? input.storageKey.split('/').pop() ?? '',
      contentType: input.contentType ?? 'image/jpeg',
      byteSize: input.byteSize ?? 0,
    })
    .returning();
  return mapAsset(inserted);
}

export async function deleteAdminMediaAsset(id: string) {
  const [deleted] = await db.delete(mediaAssets).where(eq(mediaAssets.id, id)).returning({ id: mediaAssets.id });
  return Boolean(deleted);
}

/** Shared library type for all entity big-background uploads */
export const MEDIA_ASSET_TYPE_BACKGROUND = 'background';

/** Shared library type for all entity cover uploads */
export const MEDIA_ASSET_TYPE_COVER = 'cover';

/** @deprecated use MEDIA_ASSET_TYPE_BACKGROUND — kept as aliases for call sites */
export const LEGACY_BACKGROUND_MEDIA_TYPES = [
  'partner_center_background',
  'brand_narrative_background',
  'solution_background',
  'product_background',
] as const;

export const MEDIA_ASSET_TYPES = [
  MEDIA_ASSET_TYPE_BACKGROUND,
  MEDIA_ASSET_TYPE_COVER,
  ...LEGACY_BACKGROUND_MEDIA_TYPES,
] as const;

export type MediaAssetType = (typeof MEDIA_ASSET_TYPES)[number];

export type AdminMediaAsset = {
  id: string;
  type: MediaAssetType | string;
  storageKey: string;
  filename: string;
  contentType: string;
  byteSize: number;
  url: string;
  createdAt: string;
  updatedAt: string;
};

export function isBackgroundMediaType(value: string): boolean {
  return value === MEDIA_ASSET_TYPE_BACKGROUND
    || (LEGACY_BACKGROUND_MEDIA_TYPES as readonly string[]).includes(value);
}

export function isCoverMediaType(value: string): boolean {
  return value === MEDIA_ASSET_TYPE_COVER;
}

/** Normalize any background-related type to the shared library type */
export function normalizeMediaAssetType(value: string): string {
  if (isBackgroundMediaType(value)) return MEDIA_ASSET_TYPE_BACKGROUND;
  if (isCoverMediaType(value)) return MEDIA_ASSET_TYPE_COVER;
  return value;
}

type MediaAssetPresignResponse = {
  uploadUrl: string;
  url: string;
  key: string;
  filename: string;
  size: number;
  contentType: string;
  message?: string;
};

/** Presign → PUT R2 → register into shared media_assets library. */
export async function uploadSharedMediaAsset(
  file: File,
  type: MediaAssetType | string,
): Promise<AdminMediaAsset> {
  const presignResponse = await fetch('/api/admin/media-assets/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type,
      filename: file.name,
      contentType: file.type,
      size: file.size,
    }),
  });
  const presign = await presignResponse.json().catch(() => ({})) as MediaAssetPresignResponse;
  if (!presignResponse.ok) {
    throw new Error(presign.message ?? '预签名失败');
  }
  if (!presign.uploadUrl || !presign.key) {
    throw new Error('预签名响应无效');
  }

  const putResponse = await fetch(presign.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
  });
  if (!putResponse.ok) {
    throw new Error(`直传存储失败 (${putResponse.status})`);
  }

  const registerResponse = await fetch('/api/admin/media-assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type,
      storageKey: presign.key,
      filename: file.name,
      contentType: file.type,
      byteSize: file.size,
    }),
  });
  const asset = await registerResponse.json().catch(() => null) as (AdminMediaAsset & { message?: string }) | null;
  if (!registerResponse.ok || !asset?.id) {
    throw new Error(asset?.message ?? '登记素材失败');
  }
  return asset;
}

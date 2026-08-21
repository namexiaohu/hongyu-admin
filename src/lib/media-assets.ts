/** Shared library type for all entity big-background uploads */
export const MEDIA_ASSET_TYPE_BACKGROUND = 'background';

/** @deprecated use MEDIA_ASSET_TYPE_BACKGROUND — kept as aliases for call sites */
export const LEGACY_BACKGROUND_MEDIA_TYPES = [
  'partner_center_background',
  'brand_narrative_background',
  'solution_background',
  'product_background',
] as const;

export const MEDIA_ASSET_TYPES = [MEDIA_ASSET_TYPE_BACKGROUND, ...LEGACY_BACKGROUND_MEDIA_TYPES] as const;

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
  return (MEDIA_ASSET_TYPES as readonly string[]).includes(value);
}

/** Normalize any background-related type to the shared library type */
export function normalizeMediaAssetType(value: string): string {
  if (isBackgroundMediaType(value)) return MEDIA_ASSET_TYPE_BACKGROUND;
  return value;
}

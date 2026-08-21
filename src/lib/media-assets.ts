export const MEDIA_ASSET_TYPES = [
  'partner_center_background',
  'brand_narrative_background',
  'solution_background',
  'product_background',
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

import { resolveOssAssetUrl } from '@/lib/oss-asset-url';
import {
  normalizeCoverWrite,
  resolveAdminCoverPreview,
  type CoverImageMode,
} from '@/lib/cover-presets';

export function resolveCoverFieldsForWrite(input: {
  coverMode?: string | null;
  coverValue?: string | null;
}): Promise<{ coverMode: CoverImageMode; coverValue: string; coverImage: string }> {
  return Promise.resolve(normalizeCoverWrite(input.coverMode ?? '', input.coverValue ?? ''));
}

export function resolveBlockItemCoversForWrite<
  T extends { coverMode?: string; coverValue?: string; coverImage?: string },
>(items: T[] | undefined): Promise<T[]> {
  if (!items?.length) return Promise.resolve(items ?? []);

  return Promise.resolve(
    items.map((item) => {
      const normalized = normalizeCoverWrite(item.coverMode, item.coverValue);
      if (normalized.coverMode === 'upload' && normalized.coverValue) {
        return {
          ...item,
          coverMode: normalized.coverMode,
          coverValue: normalized.coverValue,
          coverImage: normalized.coverValue,
        };
      }
      if (normalized.coverMode === 'preset') {
        return {
          ...item,
          coverMode: normalized.coverMode,
          coverValue: normalized.coverValue,
          coverImage: '',
        };
      }
      if (item.coverImage?.trim() && !item.coverMode) {
        return {
          ...item,
          coverMode: '',
          coverValue: '',
          coverImage: item.coverImage.trim(),
        };
      }
      return {
        ...item,
        coverMode: '',
        coverValue: '',
        coverImage: '',
      };
    }),
  );
}

export function collectCoverUploadKeys(
  rows: Array<{ coverMode?: string | null; coverValue?: string | null }>,
) {
  return rows
    .filter((row) => row.coverMode === 'upload' && row.coverValue)
    .map((row) => row.coverValue!)
    .filter(Boolean);
}

/** @deprecated use collectCoverUploadKeys — kept for callers during rename */
export const collectCoverUploadIds = collectCoverUploadKeys;

export function collectCoverUploadKeysFromBlocks(
  blocks: Array<{ items?: Array<{ coverMode?: string; coverValue?: string }> }>,
) {
  const keys: string[] = [];
  for (const block of blocks) {
    for (const item of block.items ?? []) {
      if (item.coverMode === 'upload' && item.coverValue) keys.push(item.coverValue);
    }
  }
  return keys;
}

/** @deprecated use collectCoverUploadKeysFromBlocks */
export const collectCoverUploadIdsFromBlocks = collectCoverUploadKeysFromBlocks;

export function mapItemCoverForAdmin<
  T extends { coverMode?: string; coverValue?: string; coverImage?: string; coverPreviewUrl?: string },
>(item: T): T {
  const preview = resolveAdminCoverPreview({
    mode: item.coverMode ?? '',
    value: item.coverValue ?? '',
    legacyCoverImageKey: item.coverImage ?? '',
    toPublicUrl: resolveOssAssetUrl,
  });
  return {
    ...item,
    coverMode: preview.mode,
    coverValue: preview.value,
    coverPreviewUrl: preview.previewUrl,
  };
}

export function mapBlocksCoverForAdmin<
  T extends { items?: Array<{ coverMode?: string; coverValue?: string; coverImage?: string; coverPreviewUrl?: string }> },
>(blocks: T[]): T[] {
  return blocks.map((block) => ({
    ...block,
    items: (block.items ?? []).map((item) => mapItemCoverForAdmin(item)),
  }));
}

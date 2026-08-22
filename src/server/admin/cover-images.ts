import { resolveOssAssetUrl } from '@/lib/oss-asset-url';
import {
  normalizeCoverWrite,
  resolveAdminCoverPreview,
  type CoverImageMode,
} from '@/lib/cover-presets';
import { getAdminMediaAssetStorageKeys } from '@/server/admin/media-assets';

export async function resolveCoverFieldsForWrite(input: {
  coverMode?: string | null;
  coverValue?: string | null;
}): Promise<{ coverMode: CoverImageMode; coverValue: string; coverImage: string }> {
  const normalized = normalizeCoverWrite(input.coverMode ?? '', input.coverValue ?? '');
  if (normalized.coverMode === 'upload' && normalized.coverValue) {
    const keys = await getAdminMediaAssetStorageKeys([normalized.coverValue]);
    return {
      ...normalized,
      coverImage: keys.get(normalized.coverValue) ?? '',
    };
  }
  return normalized;
}

export async function resolveBlockItemCoversForWrite<
  T extends { coverMode?: string; coverValue?: string; coverImage?: string },
>(items: T[] | undefined): Promise<T[]> {
  if (!items?.length) return items ?? [];
  const ids = items
    .filter((item) => (item.coverMode || '') === 'upload' && item.coverValue)
    .map((item) => item.coverValue!)
    .filter(Boolean);
  const keys = await getAdminMediaAssetStorageKeys(ids);

  return items.map((item) => {
    const normalized = normalizeCoverWrite(item.coverMode, item.coverValue);
    if (normalized.coverMode === 'upload' && normalized.coverValue) {
      return {
        ...item,
        coverMode: normalized.coverMode,
        coverValue: normalized.coverValue,
        coverImage: keys.get(normalized.coverValue) ?? item.coverImage ?? '',
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
  });
}

export function collectCoverUploadIds(
  rows: Array<{ coverMode?: string | null; coverValue?: string | null }>,
) {
  return rows
    .filter((row) => row.coverMode === 'upload' && row.coverValue)
    .map((row) => row.coverValue!)
    .filter(Boolean);
}

export function collectCoverUploadIdsFromBlocks(
  blocks: Array<{ items?: Array<{ coverMode?: string; coverValue?: string }> }>,
) {
  const ids: string[] = [];
  for (const block of blocks) {
    for (const item of block.items ?? []) {
      if (item.coverMode === 'upload' && item.coverValue) ids.push(item.coverValue);
    }
  }
  return ids;
}

export function mapItemCoverForAdmin<
  T extends { coverMode?: string; coverValue?: string; coverImage?: string; coverPreviewUrl?: string },
>(item: T, uploadKeyById: Map<string, string>): T {
  const preview = resolveAdminCoverPreview({
    mode: item.coverMode ?? '',
    value: item.coverValue ?? '',
    legacyCoverImageKey: item.coverImage ?? '',
    uploadKeyById,
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
>(blocks: T[], uploadKeyById: Map<string, string>): T[] {
  return blocks.map((block) => ({
    ...block,
    items: (block.items ?? []).map((item) => mapItemCoverForAdmin(item, uploadKeyById)),
  }));
}

import type { AdminMediaAsset } from '@/lib/media-assets';
import { MEDIA_ASSET_TYPE_BACKGROUND } from '@/lib/media-assets';

/** Session cache: shared across all entity editors until page reload. */
let cachedItems: AdminMediaAsset[] | null = null;
let inflight: Promise<AdminMediaAsset[]> | null = null;

export function peekSharedBackgroundMediaAssets(): AdminMediaAsset[] | null {
  return cachedItems;
}

export async function getSharedBackgroundMediaAssets(options?: {
  force?: boolean;
}): Promise<AdminMediaAsset[]> {
  const force = Boolean(options?.force);
  if (!force && cachedItems) return cachedItems;
  if (!force && inflight) return inflight;

  const request = (async () => {
    const response = await fetch(`/api/admin/media-assets?type=${MEDIA_ASSET_TYPE_BACKGROUND}`);
    if (!response.ok) throw new Error('加载图库失败');
    const data = (await response.json()) as { items?: AdminMediaAsset[] };
    const items = data.items ?? [];
    cachedItems = items;
    return items;
  })();

  inflight = request.finally(() => {
    if (inflight === request) inflight = null;
  });

  return inflight;
}

export function setSharedBackgroundMediaAssets(items: AdminMediaAsset[]) {
  cachedItems = items;
}

export function prependSharedBackgroundMediaAsset(asset: AdminMediaAsset) {
  const next = [asset, ...(cachedItems ?? []).filter((item) => item.id !== asset.id)];
  cachedItems = next;
  return next;
}

export function removeSharedBackgroundMediaAsset(id: string) {
  const next = (cachedItems ?? []).filter((item) => item.id !== id);
  cachedItems = next;
  return next;
}

/** Legacy rows may still store media_assets.id (UUID) in coverValue/backgroundValue. */
export const UPLOAD_VALUE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Resolve R2 storage key from upload-mode value; falls back to legacy *_image column for old UUID values. */
export function resolveUploadStorageKey(value: string | null | undefined, legacyKey?: string | null): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return legacyKey?.trim() ?? '';
  if (UPLOAD_VALUE_UUID_RE.test(trimmed)) {
    return legacyKey?.trim() ?? '';
  }
  return trimmed;
}

export function isUploadValueStorageKey(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? '';
  return Boolean(trimmed) && !UPLOAD_VALUE_UUID_RE.test(trimmed);
}

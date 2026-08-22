import { resolveAdminCoverPreview } from '@/lib/cover-presets';
import { resolveAdminBackgroundPreview } from '@/lib/partner-center-background-presets';

type AdminMediaRow = {
  backgroundMode?: string | null;
  backgroundValue?: string | null;
  backgroundImage?: string | null;
  coverMode?: string | null;
  coverValue?: string | null;
  coverImage?: string | null;
};

export function resolveAdminRowMediaPreviews(
  row: AdminMediaRow,
  toPublicUrl: (storageKey: string) => string,
) {
  return {
    background: resolveAdminBackgroundPreview({
      mode: row.backgroundMode ?? '',
      value: row.backgroundValue ?? '',
      legacyBackgroundImageKey: row.backgroundImage ?? '',
      toPublicUrl,
    }),
    cover: resolveAdminCoverPreview({
      mode: row.coverMode ?? '',
      value: row.coverValue ?? '',
      legacyCoverImageKey: row.coverImage ?? '',
      toPublicUrl,
    }),
  };
}

/**
 * List hero boards: video + cover only (no gallery).
 * Re-exports / thin wrappers over hero-cover-display.
 */
import {
  HERO_COVER_DISPLAY_OPTIONS_NO_GALLERY,
  defaultHeroCoverDisplayNoGallery,
  heroCoverDisplayFromCheckedValues,
  heroCoverDisplaySchema,
  heroCoverDisplayToCheckedValues,
  normalizeHeroCoverDisplay,
  resolveStorefrontHeroCoverDisplay,
  type HeroCoverDisplay,
  type HeroCoverDisplayKey,
} from '@/lib/hero-cover-display';

export type ListHeroCoverDisplayKey = Exclude<HeroCoverDisplayKey, 'gallery'>;

export type ListHeroCoverDisplay = {
  video: boolean;
  cover: boolean;
};

export const LIST_HERO_COVER_DISPLAY_OPTIONS = HERO_COVER_DISPLAY_OPTIONS_NO_GALLERY;

export const listHeroCoverDisplaySchema = heroCoverDisplaySchema;

export function defaultListHeroCoverDisplay(): ListHeroCoverDisplay {
  return defaultHeroCoverDisplayNoGallery();
}

export function listHeroCoverDisplayToCheckedValues(display: ListHeroCoverDisplay): ListHeroCoverDisplayKey[] {
  return heroCoverDisplayToCheckedValues(display, false) as ListHeroCoverDisplayKey[];
}

export function listHeroCoverDisplayFromCheckedValues(
  values: ListHeroCoverDisplayKey[] | undefined,
): ListHeroCoverDisplay {
  const full = heroCoverDisplayFromCheckedValues(values, false);
  return { video: full.video, cover: full.cover };
}

export function normalizeListHeroCoverDisplay(
  input: Partial<ListHeroCoverDisplay> | undefined,
  current?: ListHeroCoverDisplay,
): ListHeroCoverDisplay {
  const full = normalizeHeroCoverDisplay(input, current, false);
  return { video: full.video, cover: full.cover };
}

export function resolveStorefrontListHeroCoverDisplay(
  input?: Partial<ListHeroCoverDisplay> | null,
): ListHeroCoverDisplay {
  const full = resolveStorefrontHeroCoverDisplay(input, false);
  return { video: full.video, cover: full.cover };
}

export type { HeroCoverDisplay };

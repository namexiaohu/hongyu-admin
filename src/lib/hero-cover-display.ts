import { z } from 'zod';

export type HeroCoverDisplayKey = 'video' | 'cover' | 'gallery';

export type HeroCoverDisplay = {
  video: boolean;
  cover: boolean;
  gallery: boolean;
};

/** List boards / summit: no gallery checkbox */
export type HeroCoverDisplayWithoutGallery = {
  video: boolean;
  cover: boolean;
};

export const HERO_COVER_DISPLAY_OPTIONS_WITH_GALLERY: Array<{ value: HeroCoverDisplayKey; label: string }> = [
  { value: 'video', label: '视频' },
  { value: 'cover', label: '封面' },
  { value: 'gallery', label: '轮播图' },
];

export const HERO_COVER_DISPLAY_OPTIONS_NO_GALLERY: Array<{ value: Exclude<HeroCoverDisplayKey, 'gallery'>; label: string }> = [
  { value: 'video', label: '视频' },
  { value: 'cover', label: '封面' },
];

export const heroCoverDisplaySchema = z.object({
  video: z.boolean().optional(),
  cover: z.boolean().optional(),
  gallery: z.boolean().optional(),
});

export function defaultHeroCoverDisplay(includeGallery = true): HeroCoverDisplay {
  return {
    video: true,
    cover: true,
    gallery: includeGallery,
  };
}

export function defaultHeroCoverDisplayNoGallery(): HeroCoverDisplayWithoutGallery {
  return { video: true, cover: true };
}

export function heroCoverDisplayToCheckedValues(
  display: Partial<HeroCoverDisplay> | HeroCoverDisplayWithoutGallery,
  includeGallery: boolean,
): HeroCoverDisplayKey[] {
  const values: HeroCoverDisplayKey[] = [];
  if (display.video) values.push('video');
  if (display.cover) values.push('cover');
  if (includeGallery && 'gallery' in display && display.gallery) values.push('gallery');
  return values;
}

export function heroCoverDisplayFromCheckedValues(
  values: HeroCoverDisplayKey[] | undefined,
  includeGallery: boolean,
): HeroCoverDisplay {
  const checked = new Set(values ?? []);
  return {
    video: checked.has('video'),
    cover: checked.has('cover'),
    gallery: includeGallery ? checked.has('gallery') : false,
  };
}

export function normalizeHeroCoverDisplay(
  input: Partial<HeroCoverDisplay> | undefined,
  current?: Partial<HeroCoverDisplay>,
  includeGallery = true,
): HeroCoverDisplay {
  const base = current
    ? {
        video: current.video ?? true,
        cover: current.cover ?? true,
        gallery: includeGallery ? (current.gallery ?? true) : false,
      }
    : defaultHeroCoverDisplay(includeGallery);
  if (!input) return base;
  return {
    video: input.video ?? base.video,
    cover: input.cover ?? base.cover,
    gallery: includeGallery ? (input.gallery ?? base.gallery) : false,
  };
}

/** Storefront: missing/empty → all enabled (gallery only when includeGallery). */
export function resolveStorefrontHeroCoverDisplay(
  input?: Partial<HeroCoverDisplay> | null,
  includeGallery = true,
): HeroCoverDisplay {
  if (
    !input
    || (input.video === undefined && input.cover === undefined && input.gallery === undefined)
  ) {
    return defaultHeroCoverDisplay(includeGallery);
  }
  return normalizeHeroCoverDisplay(input, defaultHeroCoverDisplay(includeGallery), includeGallery);
}

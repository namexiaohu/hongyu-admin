import { z } from 'zod';

export type ListHeroCoverDisplayKey = 'video' | 'cover';

export type ListHeroCoverDisplay = {
  video: boolean;
  cover: boolean;
};

export const LIST_HERO_COVER_DISPLAY_OPTIONS: Array<{ value: ListHeroCoverDisplayKey; label: string }> = [
  { value: 'video', label: '视频' },
  { value: 'cover', label: '封面' },
];

export const listHeroCoverDisplaySchema = z.object({
  video: z.boolean().optional(),
  cover: z.boolean().optional(),
});

export function defaultListHeroCoverDisplay(): ListHeroCoverDisplay {
  return { video: true, cover: true };
}

export function listHeroCoverDisplayToCheckedValues(display: ListHeroCoverDisplay): ListHeroCoverDisplayKey[] {
  const values: ListHeroCoverDisplayKey[] = [];
  if (display.video) values.push('video');
  if (display.cover) values.push('cover');
  return values;
}

export function listHeroCoverDisplayFromCheckedValues(values: ListHeroCoverDisplayKey[] | undefined): ListHeroCoverDisplay {
  const checked = new Set(values ?? []);
  return {
    video: checked.has('video'),
    cover: checked.has('cover'),
  };
}

export function normalizeListHeroCoverDisplay(
  input: Partial<ListHeroCoverDisplay> | undefined,
  current?: ListHeroCoverDisplay,
): ListHeroCoverDisplay {
  const base = current ?? defaultListHeroCoverDisplay();
  if (!input) return base;
  return {
    video: input.video ?? base.video,
    cover: input.cover ?? base.cover,
  };
}

export function resolveStorefrontListHeroCoverDisplay(input?: Partial<ListHeroCoverDisplay> | null): ListHeroCoverDisplay {
  if (!input || (input.video === undefined && input.cover === undefined)) {
    return defaultListHeroCoverDisplay();
  }
  return normalizeListHeroCoverDisplay(input, defaultListHeroCoverDisplay());
}

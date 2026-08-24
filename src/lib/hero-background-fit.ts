import { z } from 'zod';

export const heroBackgroundFitModes = ['contain', 'contain-center', 'cover'] as const;
export type HeroBackgroundFitMode = (typeof heroBackgroundFitModes)[number];

export const HERO_BACKGROUND_FIT_OPTIONS: Array<{ value: HeroBackgroundFitMode; label: string }> = [
  { value: 'contain', label: '保持比例' },
  { value: 'contain-center', label: '保持比例居中' },
  { value: 'cover', label: '拉伸铺满' },
];

export const heroBackgroundFitModeSchema = z.enum(heroBackgroundFitModes);
export const heroBackgroundFitModeOptionalSchema = heroBackgroundFitModeSchema.optional();

export function defaultHeroBackgroundFitMode(): HeroBackgroundFitMode {
  return 'contain';
}

export function resolveStorefrontHeroBackgroundFitMode(value?: string | null): HeroBackgroundFitMode {
  if (value === 'cover') return 'cover';
  if (value === 'contain-center') return 'contain-center';
  return 'contain';
}

export function normalizeHeroBackgroundFitModeForWrite(value?: string | null): HeroBackgroundFitMode {
  return resolveStorefrontHeroBackgroundFitMode(value);
}

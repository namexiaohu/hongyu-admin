import { z } from 'zod';

export const heroCopyStyles = ['light', 'dark'] as const;
export type HeroCopyStyle = (typeof heroCopyStyles)[number];

export const HERO_COPY_STYLE_OPTIONS: Array<{ value: HeroCopyStyle; label: string }> = [
  { value: 'light', label: '浅色字暗色底' },
  { value: 'dark', label: '暗色字浅色底' },
];

export const heroCopyStyleSchema = z.enum(heroCopyStyles);
export const heroCopyStyleOptionalSchema = heroCopyStyleSchema.nullable().optional();

export const heroCopyStyleLabels: Record<HeroCopyStyle, string> = {
  light: '浅色字暗色底',
  dark: '暗色字浅色底',
};

/**
 * Admin / new-record default: 浅色字暗色底.
 * Matches the global solid-background fallback (纯色第一色 / 品牌蓝, dark surface).
 */
export function defaultAdminHeroCopyStyle(): HeroCopyStyle {
  return 'light';
}

/** Storefront + admin coerce: unset/null/invalid → light */
export function resolveStorefrontHeroCopyStyle(value?: string | null): HeroCopyStyle {
  return value === 'dark' ? 'dark' : 'light';
}

/**
 * Normalize admin write; empty/invalid → default light
 * (aligned with pure-color first-preset dark background).
 */
export function normalizeHeroCopyStyleForWrite(value?: string | null): HeroCopyStyle {
  const trimmed = value?.trim() ?? '';
  if (trimmed === 'light' || trimmed === 'dark') return trimmed;
  return defaultAdminHeroCopyStyle();
}

export type TranslationLocaleRow = {
  locale: string;
  createdAt?: Date | string;
};

function resolveCreatedAt(value: Date | string | undefined) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/** 按站点默认语言选取展示用翻译；无默认语言版本时回退到最早创建的翻译。 */
export function pickTranslationForDisplay<T extends TranslationLocaleRow>(
  translations: T[],
  defaultLocale: string,
): T | null {
  if (!translations.length) return null;

  const normalizedDefault = defaultLocale.trim().toLowerCase();
  if (normalizedDefault) {
    const match = translations.find((item) => item.locale.toLowerCase() === normalizedDefault);
    if (match) return match;
  }

  const sorted = [...translations].sort(
    (left, right) => resolveCreatedAt(left.createdAt) - resolveCreatedAt(right.createdAt),
  );
  return sorted[0] ?? null;
}

/** 优先匹配 locale；缺失时回退到站点默认语言，再回退到最早创建的翻译。 */
export function pickTranslationForLocale<T extends TranslationLocaleRow>(
  translations: T[],
  locale: string,
  fallbackLocale: string,
): T | null {
  const normalized = locale.trim().toLowerCase();
  if (normalized) {
    const match = translations.find((item) => item.locale.toLowerCase() === normalized);
    if (match) return match;
  }
  return pickTranslationForDisplay(translations, fallbackLocale);
}

/** 仅精确匹配 locale，无 fallback。 */
export function pickTranslationStrict<T extends TranslationLocaleRow>(
  translations: T[],
  locale: string,
): T | null {
  const normalized = locale.trim().toLowerCase();
  if (!normalized) return null;
  return translations.find((item) => item.locale.toLowerCase() === normalized) ?? null;
}

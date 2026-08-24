/** Language detection and locale-family helpers for CMS locale repair. */

export type LangKind = 'zh' | 'en' | 'empty' | 'mixed' | 'unknown';

export const CANONICAL_ZH = 'zh-CN';
export const CANONICAL_EN = 'en';

const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g;
const LATIN_RE = /[A-Za-z]/g;

export function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function collectText(values: unknown[]): string {
  const parts: string[] = [];
  for (const value of values) {
    if (value == null) continue;
    if (typeof value === 'string') {
      const text = stripHtml(value);
      if (text) parts.push(text);
      continue;
    }
    if (typeof value === 'number' || typeof value === 'boolean') continue;
    if (Array.isArray(value)) {
      const nested = collectText(value);
      if (nested) parts.push(nested);
      continue;
    }
    if (typeof value === 'object') {
      const nested = collectText(Object.values(value as Record<string, unknown>));
      if (nested) parts.push(nested);
    }
  }
  return parts.join(' ').trim();
}

export function detectLang(raw: string): LangKind {
  const text = stripHtml(raw);
  if (!text || text.length < 2) return 'empty';

  const cjk = text.match(CJK_RE)?.length ?? 0;
  const latin = text.match(LATIN_RE)?.length ?? 0;
  const letters = cjk + latin;
  if (letters < 2) return 'unknown';

  const cjkRatio = cjk / letters;
  if (cjk >= 2 && cjkRatio >= 0.15) {
    if (latin >= 12 && cjkRatio < 0.45) return 'mixed';
    return 'zh';
  }
  if (latin >= 3 && cjk === 0) return 'en';
  if (latin >= 8 && cjkRatio < 0.05) return 'en';
  if (cjk > 0 && latin > 0) return 'mixed';
  return 'unknown';
}

export function isZhLocale(code: string): boolean {
  return code.toLowerCase().startsWith('zh');
}

export function isEnLocale(code: string): boolean {
  return code.toLowerCase().startsWith('en');
}

export function normalizeFamily(code: string): 'zh' | 'en' | 'other' {
  if (isZhLocale(code)) return 'zh';
  if (isEnLocale(code)) return 'en';
  return 'other';
}

export function pickPreferredLocaleRow<T extends { locale: string }>(
  rows: T[],
  family: 'zh' | 'en',
): T | null {
  const matches = rows.filter((row) => normalizeFamily(row.locale) === family);
  if (!matches.length) return null;
  const preferred = family === 'zh' ? CANONICAL_ZH : CANONICAL_EN;
  return matches.find((row) => row.locale === preferred)
    ?? matches.find((row) => row.locale.toLowerCase() === preferred.toLowerCase())
    ?? matches[0]
    ?? null;
}

export type PairAction =
  | 'ok'
  | 'swap'
  | 'move_en_to_zh'
  | 'move_zh_to_en'
  | 'retranslate_en'
  | 'translate_en'
  | 'skip';

export function decidePairAction(zhLang: LangKind, enLang: LangKind): PairAction {
  const zhOk = zhLang === 'zh' || zhLang === 'mixed';
  const enOk = enLang === 'en' || enLang === 'mixed';
  const zhEmpty = zhLang === 'empty' || zhLang === 'unknown';
  const enEmpty = enLang === 'empty' || enLang === 'unknown';

  if (zhLang === 'en' && enLang === 'zh') return 'swap';
  if (enLang === 'zh' && zhOk) return 'retranslate_en';
  if (enLang === 'zh' && zhEmpty) return 'move_en_to_zh';
  if (zhLang === 'en' && enEmpty) return 'move_zh_to_en';
  if (zhOk && enEmpty) return 'translate_en';
  if (zhOk && enOk) return 'ok';
  if (!zhOk && enOk) return 'ok';
  return 'skip';
}

export function sleep(ms: number) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

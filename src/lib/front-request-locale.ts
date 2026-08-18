import type { NextRequest } from 'next/server';

import { DEFAULT_LOCALE, LOCALE_REQUEST_HEADER, type Locale } from '@/lib/i18n';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';

function readRequestedLocale(request: Pick<NextRequest, 'headers' | 'nextUrl'>) {
  return request.headers.get(LOCALE_REQUEST_HEADER)?.trim()
    || request.nextUrl.searchParams.get('locale')?.trim()
    || '';
}

export async function resolveFrontRequestLocale(
  request: Pick<NextRequest, 'headers' | 'nextUrl'>,
): Promise<string> {
  const requested = readRequestedLocale(request);
  if (requested) return requested;
  return getDefaultSiteLanguageCode();
}

export function resolveLocaleValue(value?: string | null): Locale | string {
  const trimmed = value?.trim();
  return trimmed || DEFAULT_LOCALE;
}

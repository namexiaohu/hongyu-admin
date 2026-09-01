import { NextRequest, NextResponse } from 'next/server';

import type { UiStringResetScope, UiStringSite } from '@/lib/ui-strings';
import {
  getAdminUiStrings,
  resetUiStringTranslations,
  syncUiStringsFromManifest,
  translateSingleUiString,
  updateAdminUiStringDefaultText,
  updateAdminUiStringTranslation,
} from '@/server/admin/ui-strings';

function mapError(error: unknown) {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case 'ENGLISH_IS_DEFAULT_TEXT':
      return { status: 400, code: 'ENGLISH_IS_DEFAULT_TEXT', message: '英文原文保存在 default_text，不写入翻译表' };
    case 'INVALID_RESET_LOCALE':
      return { status: 400, code: 'INVALID_RESET_LOCALE', message: '无效的重置语言' };
    default:
      if (error.message.startsWith('MANIFEST_FETCH_FAILED:')) {
        return { status: 502, code: 'MANIFEST_FETCH_FAILED', message: '无法拉取前台 manifest' };
      }
      return null;
  }
}

export async function handleAdminUiStringsGet(site: UiStringSite, request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const group = searchParams.get('group') ?? undefined;
  const status = searchParams.get('status') as 'active' | 'deprecated' | null;
  const missingOnly = searchParams.get('missingOnly') === '1';
  const search = searchParams.get('search') ?? undefined;

  const result = await getAdminUiStrings(site, {
    group,
    status: status ?? undefined,
    missingOnly,
    search,
  });

  return NextResponse.json(result);
}

export async function handleAdminUiStringsPut(site: UiStringSite, request: NextRequest) {
  const body = await request.json() as {
    key?: string;
    locale?: string;
    value?: string;
    defaultText?: string;
    source?: 'manual' | 'llm';
  };

  if (!body.key) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'key is required' }, { status: 400 });
  }

  try {
    if (typeof body.defaultText === 'string') {
      const saved = await updateAdminUiStringDefaultText({
        site,
        key: body.key,
        defaultText: body.defaultText,
      });

      if (!saved) {
        return NextResponse.json({ code: 'NOT_FOUND', message: 'UI string key not found' }, { status: 404 });
      }

      return NextResponse.json({ item: saved });
    }

    if (!body.locale || typeof body.value !== 'string') {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'locale and value are required' }, { status: 400 });
    }

    const saved = await updateAdminUiStringTranslation({
      site,
      key: body.key,
      locale: body.locale,
      value: body.value,
      source: body.source,
    });

    if (!saved) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'UI string key not found' }, { status: 404 });
    }

    return NextResponse.json({ item: saved });
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return NextResponse.json({ code: mapped.code, message: mapped.message }, { status: mapped.status });
    }
    throw error;
  }
}

export async function handleAdminUiStringsPost(site: UiStringSite, request: NextRequest) {
  const body = await request.json() as {
    action?: 'sync-manifest' | 'reset' | 'translate-one';
    manifestUrl?: string;
    scope?: UiStringResetScope;
    locale?: string;
    key?: string;
    targetLocale?: string;
  };

  try {
    if (body.action === 'sync-manifest') {
      const result = await syncUiStringsFromManifest(site, body.manifestUrl);
      return NextResponse.json(result);
    }

    if (body.action === 'reset') {
      if (!body.scope) {
        return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'scope is required' }, { status: 400 });
      }
      const result = await resetUiStringTranslations({
        site,
        scope: body.scope,
        locale: body.locale,
        manifestUrl: body.manifestUrl,
      });
      return NextResponse.json(result);
    }

    if (body.action === 'translate-one') {
      if (!body.key || !body.targetLocale) {
        return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'key and targetLocale are required' }, { status: 400 });
      }
      const saved = await translateSingleUiString({ site, key: body.key, targetLocale: body.targetLocale });
      if (!saved) {
        return NextResponse.json({ code: 'NOT_FOUND', message: 'UI string key not found' }, { status: 404 });
      }
      return NextResponse.json({ item: saved });
    }

    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Unknown action' }, { status: 400 });
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return NextResponse.json({ code: mapped.code, message: mapped.message }, { status: mapped.status });
    }
    throw error;
  }
}

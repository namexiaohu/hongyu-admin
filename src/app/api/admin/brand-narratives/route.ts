import { NextRequest, NextResponse } from 'next/server';

import { adminBrandNarrativeCreateSchema, type BrandNarrativeStatus } from '@/lib/brand-narrative-content';
import { createAdminBrandNarrative, getAdminBrandNarrativeList } from '@/server/admin/brand-narratives';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const keyword = params.get('keyword') ?? undefined;
  const status = params.get('status') as BrandNarrativeStatus | null;
  const locale = params.get('locale') ?? undefined;

  const list = await getAdminBrandNarrativeList({
    keyword,
    status: status ?? undefined,
    locale,
  });

  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = adminBrandNarrativeCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const created = await createAdminBrandNarrative(parsed.data);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'CREATE_FAILED';
    const messages: Record<string, string> = {
      SLUG_RESERVED: '该 slug 与现有前台路由冲突',
      SLUG_EXISTS: 'slug 已存在',
      ROUTE_EXISTS: '路由路径已存在',
      SLUG_INVALID: 'slug 无效',
    };
    const status = code === 'SLUG_EXISTS' || code === 'ROUTE_EXISTS' || code === 'SLUG_RESERVED' ? 409 : 400;
    return NextResponse.json({ code, message: messages[code] ?? '创建失败' }, { status });
  }
}


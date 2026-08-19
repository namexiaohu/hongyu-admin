import { NextRequest, NextResponse } from 'next/server';

import { adminSummitCreateSchema } from '@/lib/summit-content';
import { createAdminSummit, getAdminSummitList } from '@/server/admin/summits';

export async function GET() {
  const list = await getAdminSummitList();
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = adminSummitCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const created = await createAdminSummit(parsed.data);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'CREATE_FAILED';
    const messages: Record<string, string> = { SLUG_EXISTS: 'slug 已存在', SLUG_INVALID: 'slug 无效' };
    return NextResponse.json({ code, message: messages[code] ?? '创建失败' }, { status: code === 'SLUG_EXISTS' ? 409 : 400 });
  }
}

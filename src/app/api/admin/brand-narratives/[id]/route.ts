import { NextRequest, NextResponse } from 'next/server';

import { adminBrandNarrativePatchSchema } from '@/lib/brand-narrative-content';
import { getAdminBrandNarrativeDetail, updateAdminBrandNarrative, deleteAdminBrandNarrative } from '@/server/admin/brand-narratives';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getAdminBrandNarrativeDetail(id);
  if (!item) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Brand narrative not found' }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json();
  const parsed = adminBrandNarrativePatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  try {
    const updated = await updateAdminBrandNarrative(id, parsed.data);
    if (!updated) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Brand narrative not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UPDATE_FAILED';
    const messages: Record<string, string> = {
      SLUG_RESERVED: '该 slug 与现有前台路由冲突',
      SLUG_EXISTS: 'slug 已存在',
      ROUTE_EXISTS: '路由路径已存在',
      SLUG_INVALID: 'slug 无效',
    };
    const status = code === 'SLUG_EXISTS' || code === 'ROUTE_EXISTS' || code === 'SLUG_RESERVED' ? 409 : 400;
    return NextResponse.json({ code, message: messages[code] ?? '更新失败' }, { status });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await deleteAdminBrandNarrative(id);
  if (!deleted) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Brand narrative not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

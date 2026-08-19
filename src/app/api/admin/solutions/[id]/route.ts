import { NextRequest, NextResponse } from 'next/server';

import { adminSolutionPatchSchema } from '@/lib/solution-content';
import { deleteAdminSolution, getAdminSolutionDetail, updateAdminSolution } from '@/server/admin/solutions';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getAdminSolutionDetail(id);
  if (!item) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Solution not found' }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json();
  const parsed = adminSolutionPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  try {
    const updated = await updateAdminSolution(id, parsed.data);
    if (!updated) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Solution not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UPDATE_FAILED';
    const messages: Record<string, string> = {
      SLUG_RESERVED: '该 slug 与现有前台路由冲突',
      SLUG_EXISTS: 'slug 已存在',
      SLUG_INVALID: 'slug 无效',
      CATEGORY_NOT_FOUND: '所属分类不存在',
    };
    const status = code === 'SLUG_EXISTS' || code === 'SLUG_RESERVED' ? 409 : 400;
    return NextResponse.json({ code, message: messages[code] ?? '更新失败' }, { status });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await deleteAdminSolution(id);
  if (!deleted) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Solution not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

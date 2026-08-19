import { NextRequest, NextResponse } from 'next/server';

import { adminSurgeonPatchSchema } from '@/lib/surgeon-content';
import { deleteAdminSurgeon, getAdminSurgeonDetail, updateAdminSurgeon } from '@/server/admin/surgeons';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getAdminSurgeonDetail(id);
  if (!item) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Surgeon not found' }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json();
  const parsed = adminSurgeonPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  try {
    const updated = await updateAdminSurgeon(id, parsed.data);
    if (!updated) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Surgeon not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UPDATE_FAILED';
    const messages: Record<string, string> = {
      SLUG_EXISTS: 'slug 已存在',
      SLUG_INVALID: 'slug 无效',
    };
    const status = code === 'SLUG_EXISTS' ? 409 : 400;
    return NextResponse.json({ code, message: messages[code] ?? '更新失败' }, { status });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await deleteAdminSurgeon(id);
  if (!deleted) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Surgeon not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

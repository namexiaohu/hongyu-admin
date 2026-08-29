import { NextRequest, NextResponse } from 'next/server';

import { adminAcademyCertificatePatchSchema } from '@/lib/academy-certificate-content';
import {
  deleteAdminAcademyCertificate,
  getAdminAcademyCertificateDetail,
  updateAdminAcademyCertificate,
} from '@/server/admin/academy-certificates';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const detail = await getAdminAcademyCertificateDetail(id);
  if (!detail) return NextResponse.json({ code: 'NOT_FOUND', message: '证书不存在' }, { status: 404 });
  return NextResponse.json(detail);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const parsed = adminAcademyCertificatePatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const updated = await updateAdminAcademyCertificate(id, parsed.data);
    if (!updated) return NextResponse.json({ code: 'NOT_FOUND', message: '证书不存在' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UPDATE_FAILED';
    const messages: Record<string, string> = {
      SLUG_EXISTS: 'slug 已存在',
      SLUG_INVALID: 'slug 无效',
      SLUG_RESERVED: 'slug 为保留字',
    };
    const status = code === 'SLUG_EXISTS' ? 409 : 400;
    return NextResponse.json({ code, message: messages[code] ?? '更新失败' }, { status });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const deleted = await deleteAdminAcademyCertificate(id);
  if (!deleted) return NextResponse.json({ code: 'NOT_FOUND', message: '证书不存在' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

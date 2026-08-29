import { NextRequest, NextResponse } from 'next/server';

import { adminAcademyUnitPatchSchema } from '@/lib/academy-unit-content';
import {
  deleteAdminAcademyUnit,
  getAdminAcademyUnitDetail,
  updateAdminAcademyUnit,
} from '@/server/admin/academy-units';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const detail = await getAdminAcademyUnitDetail(id);
  if (!detail) return NextResponse.json({ code: 'NOT_FOUND', message: '单元不存在' }, { status: 404 });
  return NextResponse.json(detail);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const parsed = adminAcademyUnitPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }
  const updated = await updateAdminAcademyUnit(id, parsed.data);
  if (!updated) return NextResponse.json({ code: 'NOT_FOUND', message: '单元不存在' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const deleted = await deleteAdminAcademyUnit(id);
  if (!deleted) return NextResponse.json({ code: 'NOT_FOUND', message: '单元不存在' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

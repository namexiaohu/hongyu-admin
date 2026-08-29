import { NextRequest, NextResponse } from 'next/server';

import { adminAcademyUnitCreateSchema, adminAcademyUnitReorderSchema } from '@/lib/academy-unit-content';
import {
  createAdminAcademyUnit,
  listAdminAcademyUnits,
  reorderAdminAcademyUnits,
} from '@/server/admin/academy-units';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const items = await listAdminAcademyUnits(id);
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const parsed = adminAcademyUnitCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const created = await createAdminAcademyUnit(id, parsed.data);
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ code: 'CREATE_FAILED', message: '创建单元失败' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const parsed = adminAcademyUnitReorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const items = await reorderAdminAcademyUnits(id, parsed.data.ids);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ code: 'REORDER_INVALID', message: '排序无效' }, { status: 400 });
  }
}

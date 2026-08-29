import { NextRequest, NextResponse } from 'next/server';

import { adminAcademyUnitTranslationSchema } from '@/lib/academy-unit-content';
import { upsertAdminAcademyUnitTranslation } from '@/server/admin/academy-units';

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const parsed = adminAcademyUnitTranslationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }
  const updated = await upsertAdminAcademyUnitTranslation(id, parsed.data);
  if (!updated) return NextResponse.json({ code: 'NOT_FOUND', message: '单元不存在' }, { status: 404 });
  return NextResponse.json(updated);
}

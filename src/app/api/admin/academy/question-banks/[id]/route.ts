import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  deleteAdminAcademyQuestionBank,
  getAdminAcademyQuestionBankDetail,
  updateAdminAcademyQuestionBank,
} from '@/server/admin/academy-question-banks';
import { adminAcademyQuestionBankPatchSchema } from '@/lib/academy-question-bank-content';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const detail = await getAdminAcademyQuestionBankDetail(id);
  if (!detail) {
    return NextResponse.json({ code: 'NOT_FOUND', message: '题库不存在' }, { status: 404 });
  }
  return NextResponse.json(detail);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const parsed = adminAcademyQuestionBankPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }
  const updated = await updateAdminAcademyQuestionBank(id, parsed.data);
  if (!updated) {
    return NextResponse.json({ code: 'NOT_FOUND', message: '题库不存在' }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const ok = await deleteAdminAcademyQuestionBank(id);
  if (!ok) {
    return NextResponse.json({ code: 'NOT_FOUND', message: '题库不存在' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

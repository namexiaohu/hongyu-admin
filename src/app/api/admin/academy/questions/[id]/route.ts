import { NextRequest, NextResponse } from 'next/server';

import { adminAcademyQuestionPatchSchema } from '@/lib/academy-question-content';
import {
  deleteAdminAcademyQuestion,
  getAdminAcademyQuestionDetail,
  updateAdminAcademyQuestion,
} from '@/server/admin/academy-questions';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const detail = await getAdminAcademyQuestionDetail(id);
  if (!detail) {
    return NextResponse.json({ code: 'NOT_FOUND', message: '题目不存在' }, { status: 404 });
  }
  return NextResponse.json(detail);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const parsed = adminAcademyQuestionPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }
  const updated = await updateAdminAcademyQuestion(id, parsed.data);
  if (!updated) {
    return NextResponse.json({ code: 'NOT_FOUND', message: '题目不存在' }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const ok = await deleteAdminAcademyQuestion(id);
  if (!ok) {
    return NextResponse.json({ code: 'NOT_FOUND', message: '题目不存在' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';

import { adminAcademyQuestionCreateSchema, adminAcademyQuestionReorderSchema } from '@/lib/academy-question-content';
import {
  createAdminAcademyQuestion,
  listAdminAcademyQuestions,
  reorderAdminAcademyQuestions,
} from '@/server/admin/academy-questions';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const items = await listAdminAcademyQuestions(id);
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const parsed = adminAcademyQuestionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const created = await createAdminAcademyQuestion(id, parsed.data);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message = error instanceof Error && error.message === 'BANK_NOT_FOUND' ? '题库不存在' : '创建题目失败';
    return NextResponse.json({ code: 'CREATE_FAILED', message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const parsed = adminAcademyQuestionReorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const items = await reorderAdminAcademyQuestions(id, parsed.data.ids);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ code: 'REORDER_INVALID', message: '排序无效' }, { status: 400 });
  }
}

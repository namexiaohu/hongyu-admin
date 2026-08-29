import { NextRequest, NextResponse } from 'next/server';

import { adminAcademyCourseQuestionBanksPatchSchema } from '@/lib/academy-question-bank-content';
import {
  listAdminAcademyCourseQuestionBanks,
  updateAdminAcademyCourseQuestionBanks,
} from '@/server/admin/academy-course-exams';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const items = await listAdminAcademyCourseQuestionBanks(id);
  return NextResponse.json({ items });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const parsed = adminAcademyCourseQuestionBanksPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const items = await updateAdminAcademyCourseQuestionBanks(id, parsed.data);
    if (!items) {
      return NextResponse.json({ code: 'NOT_FOUND', message: '课程不存在' }, { status: 404 });
    }
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ code: 'UPDATE_FAILED', message: '更新失败' }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

import { adminAcademyQuestionTranslationSchema } from '@/lib/academy-question-content';
import { upsertAdminAcademyQuestionTranslation } from '@/server/admin/academy-questions';

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const parsed = adminAcademyQuestionTranslationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const saved = await upsertAdminAcademyQuestionTranslation(id, parsed.data);
    if (!saved) {
      return NextResponse.json({ code: 'NOT_FOUND', message: '题目不存在' }, { status: 404 });
    }
    return NextResponse.json(saved);
  } catch {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: '题目内容无效' }, { status: 400 });
  }
}

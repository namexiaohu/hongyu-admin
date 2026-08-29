import { NextRequest, NextResponse } from 'next/server';

import { adminAcademyQuestionBankTranslationSchema } from '@/lib/academy-question-bank-content';
import { upsertAdminAcademyQuestionBankTranslation } from '@/server/admin/academy-question-banks';

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const parsed = adminAcademyQuestionBankTranslationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }
  const saved = await upsertAdminAcademyQuestionBankTranslation(id, parsed.data);
  if (!saved) {
    return NextResponse.json({ code: 'NOT_FOUND', message: '题库不存在' }, { status: 404 });
  }
  return NextResponse.json(saved);
}

import { NextRequest, NextResponse } from 'next/server';

import { adminAcademyLessonTranslationSchema } from '@/lib/academy-lesson-content';
import { upsertAdminAcademyLessonTranslation } from '@/server/admin/academy-lessons';

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const parsed = adminAcademyLessonTranslationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }
  const updated = await upsertAdminAcademyLessonTranslation(id, parsed.data);
  if (!updated) return NextResponse.json({ code: 'NOT_FOUND', message: '课时不存在' }, { status: 404 });
  return NextResponse.json(updated);
}

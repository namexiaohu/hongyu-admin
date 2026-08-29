import { NextRequest, NextResponse } from 'next/server';

import { adminAcademyLessonCreateSchema, adminAcademyLessonReorderSchema } from '@/lib/academy-lesson-content';
import {
  createAdminAcademyLesson,
  listAdminAcademyLessons,
  reorderAdminAcademyLessons,
} from '@/server/admin/academy-lessons';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const items = await listAdminAcademyLessons(id);
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const parsed = adminAcademyLessonCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const created = await createAdminAcademyLesson(id, parsed.data);
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ code: 'CREATE_FAILED', message: '创建课时失败' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const parsed = adminAcademyLessonReorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const items = await reorderAdminAcademyLessons(id, parsed.data.ids);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ code: 'REORDER_INVALID', message: '排序无效' }, { status: 400 });
  }
}

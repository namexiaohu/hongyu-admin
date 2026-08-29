import { NextRequest, NextResponse } from 'next/server';

import { adminAcademyCourseCreateSchema } from '@/lib/academy-course-content';
import { createAdminAcademyCourse, getAdminAcademyCourseList } from '@/server/admin/academy-courses';

export async function GET() {
  const list = await getAdminAcademyCourseList();
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = adminAcademyCourseCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const created = await createAdminAcademyCourse(parsed.data);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'CREATE_FAILED';
    const messages: Record<string, string> = {
      SLUG_EXISTS: 'slug 已存在',
      SLUG_INVALID: 'slug 无效',
      SLUG_RESERVED: 'slug 为保留字',
    };
    const status = code === 'SLUG_EXISTS' ? 409 : 400;
    return NextResponse.json({ code, message: messages[code] ?? '创建失败' }, { status });
  }
}

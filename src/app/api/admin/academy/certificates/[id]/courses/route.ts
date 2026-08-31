import { NextRequest, NextResponse } from 'next/server';

import { adminAcademyCertificateCoursesPatchSchema } from '@/lib/academy-certificate-content';
import {
  listAdminAcademyCertificateCourses,
  updateAdminAcademyCertificateCourses,
} from '@/server/admin/academy-certificate-courses';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const items = await listAdminAcademyCertificateCourses(id);
  return NextResponse.json({ items });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const parsed = adminAcademyCertificateCoursesPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const items = await updateAdminAcademyCertificateCourses(id, parsed.data);
    if (!items) {
      return NextResponse.json({ code: 'NOT_FOUND', message: '证书不存在' }, { status: 404 });
    }
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ code: 'UPDATE_FAILED', message: '更新失败' }, { status: 400 });
  }
}

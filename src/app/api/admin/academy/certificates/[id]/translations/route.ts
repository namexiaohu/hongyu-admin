import { NextRequest, NextResponse } from 'next/server';

import { adminAcademyCertificateTranslationSchema } from '@/lib/academy-certificate-content';
import { upsertAdminAcademyCertificateTranslation } from '@/server/admin/academy-certificates';

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const parsed = adminAcademyCertificateTranslationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }
  const updated = await upsertAdminAcademyCertificateTranslation(id, parsed.data);
  if (!updated) return NextResponse.json({ code: 'NOT_FOUND', message: '证书不存在' }, { status: 404 });
  return NextResponse.json(updated);
}

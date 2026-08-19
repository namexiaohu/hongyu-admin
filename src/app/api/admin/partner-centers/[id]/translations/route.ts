import { NextRequest, NextResponse } from 'next/server';

import { adminPartnerCenterTranslationSchema } from '@/lib/partner-center-content';
import { upsertAdminPartnerCenterTranslation } from '@/server/admin/partner-centers';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json();
  const parsed = adminPartnerCenterTranslationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }
  const { id } = await params;
  const saved = await upsertAdminPartnerCenterTranslation(id, parsed.data);
  if (!saved) return NextResponse.json({ code: 'NOT_FOUND', message: 'Partner center not found' }, { status: 404 });
  return NextResponse.json(saved);
}

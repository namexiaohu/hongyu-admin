import { NextRequest, NextResponse } from 'next/server';

import { adminMarketEventTranslationSchema } from '@/lib/market-event-content';
import { upsertAdminMarketEventTranslation } from '@/server/admin/market-events';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json();
  const parsed = adminMarketEventTranslationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }
  const { id } = await params;
  const saved = await upsertAdminMarketEventTranslation(id, parsed.data);
  if (!saved) return NextResponse.json({ code: 'NOT_FOUND', message: 'Summit not found' }, { status: 404 });
  return NextResponse.json(saved);
}

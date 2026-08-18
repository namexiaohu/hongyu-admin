import { NextRequest, NextResponse } from 'next/server';

import { adminBrandNarrativeTranslationSchema } from '@/lib/brand-narrative-content';
import { upsertAdminBrandNarrativeTranslation } from '@/server/admin/brand-narratives';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json();
  const parsed = adminBrandNarrativeTranslationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const saved = await upsertAdminBrandNarrativeTranslation(id, parsed.data);
  if (!saved) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Brand narrative not found' }, { status: 404 });
  }
  return NextResponse.json(saved);
}

import { NextRequest, NextResponse } from 'next/server';

import { adminSolutionTranslationSchema } from '@/lib/solution-content';
import { upsertAdminSolutionTranslation } from '@/server/admin/solutions';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json();
  const parsed = adminSolutionTranslationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const saved = await upsertAdminSolutionTranslation(id, parsed.data);
  if (!saved) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Solution not found' }, { status: 404 });
  }
  return NextResponse.json(saved);
}

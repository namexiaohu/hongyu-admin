import { NextRequest, NextResponse } from 'next/server';

import { adminSolutionTranslationPatchSchema } from '@/lib/solution-content';
import {
  getAdminSolutionTranslation,
  updateAdminSolutionTranslation,
} from '@/server/admin/solutions';

export async function GET(_: Request, { params }: { params: Promise<{ translationId: string }> }) {
  const { translationId } = await params;
  const item = await getAdminSolutionTranslation(translationId);
  if (!item) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Translation not found' }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ translationId: string }> }) {
  const body = await request.json();
  const parsed = adminSolutionTranslationPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { translationId } = await params;
  const updated = await updateAdminSolutionTranslation(translationId, parsed.data);
  if (!updated) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Translation not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

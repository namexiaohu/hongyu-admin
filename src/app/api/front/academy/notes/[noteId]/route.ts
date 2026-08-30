import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { frontCorsHeaders } from '@/lib/front-cors';
import { getCurrentUserId } from '@/server/auth/session';
import { deleteLessonNote } from '@/server/storefront/academy-lesson-notes';

type RouteContext = { params: Promise<{ noteId: string }> };

const uuidSchema = z.string().uuid();

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const userId = await getCurrentUserId(_request);
  if (!userId) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Authentication required' },
      { status: 401, headers: frontCorsHeaders() },
    );
  }

  const { noteId } = await context.params;
  if (!uuidSchema.safeParse(noteId).success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid note id' },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  const result = await deleteLessonNote(userId, noteId);
  if (!result.ok) {
    return NextResponse.json(
      { code: result.code, message: 'Note not found' },
      { status: 404, headers: frontCorsHeaders() },
    );
  }

  return NextResponse.json({ ok: true }, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}

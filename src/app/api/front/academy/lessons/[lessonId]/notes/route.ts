import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { frontCorsHeaders } from '@/lib/front-cors';
import { getCurrentUserId } from '@/server/auth/session';
import { createLessonNote, listLessonNotes } from '@/server/storefront/academy-lesson-notes';

type RouteContext = { params: Promise<{ lessonId: string }> };

const uuidSchema = z.string().uuid();

const postSchema = z.object({
  content: z.string().trim().min(1).max(8000),
  videoPositionSeconds: z.number().int().min(0),
});

export async function GET(_request: NextRequest, context: RouteContext) {
  const userId = await getCurrentUserId(_request);
  if (!userId) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Authentication required' },
      { status: 401, headers: frontCorsHeaders() },
    );
  }

  const { lessonId } = await context.params;
  if (!uuidSchema.safeParse(lessonId).success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid lesson id' },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  const result = await listLessonNotes(userId, lessonId);
  if (!result.ok) {
    return NextResponse.json(
      { code: result.code, message: 'Lesson not found' },
      { status: 404, headers: frontCorsHeaders() },
    );
  }

  return NextResponse.json({ items: result.items }, { headers: frontCorsHeaders() });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Authentication required' },
      { status: 401, headers: frontCorsHeaders() },
    );
  }

  const { lessonId } = await context.params;
  if (!uuidSchema.safeParse(lessonId).success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid lesson id' },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid note payload', details: parsed.error.flatten() },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  const result = await createLessonNote(userId, lessonId, parsed.data);
  if (!result.ok) {
    return NextResponse.json(
      { code: result.code, message: 'Lesson not found' },
      { status: 404, headers: frontCorsHeaders() },
    );
  }

  return NextResponse.json(result.item, { status: 201, headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}

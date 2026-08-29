import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { frontCorsHeaders } from '@/lib/front-cors';
import { getCurrentUserId } from '@/server/auth/session';
import {
  listCompletedLessonIdsForCourse,
  markLessonCompleted,
} from '@/server/storefront/academy-progress';

const postSchema = z.object({
  lessonId: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Authentication required' },
      { status: 401, headers: frontCorsHeaders() },
    );
  }

  const courseSlug = request.nextUrl.searchParams.get('courseSlug')?.trim() ?? '';
  if (!courseSlug) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'courseSlug is required' },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  const result = await listCompletedLessonIdsForCourse(userId, courseSlug);
  if (!result.courseId) {
    return NextResponse.json(
      { code: 'NOT_FOUND', message: 'Course not found' },
      { status: 404, headers: frontCorsHeaders() },
    );
  }

  return NextResponse.json(
    {
      courseSlug,
      courseId: result.courseId,
      completedLessonIds: result.lessonIds,
    },
    { headers: frontCorsHeaders() },
  );
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Authentication required' },
      { status: 401, headers: frontCorsHeaders() },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid progress payload', details: parsed.error.flatten() },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  const result = await markLessonCompleted(userId, parsed.data.lessonId);
  if (!result.ok) {
    return NextResponse.json(
      { code: 'NOT_FOUND', message: 'Lesson not found' },
      { status: 404, headers: frontCorsHeaders() },
    );
  }

  return NextResponse.json(
    { ok: true, lessonId: parsed.data.lessonId },
    { status: 201, headers: frontCorsHeaders() },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}

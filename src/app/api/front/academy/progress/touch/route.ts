import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { frontCorsHeaders } from '@/lib/front-cors';
import { getCurrentUserId } from '@/server/auth/session';
import { touchCourseProgress } from '@/server/storefront/academy-home-tracking';

const bodySchema = z.object({
  certificateCourseId: z.string().uuid(),
  unitId: z.string().uuid().optional(),
  lessonId: z.string().uuid().optional(),
  positionSeconds: z.number().int().min(0).optional(),
});

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Authentication required' },
      { status: 401, headers: frontCorsHeaders(origin) },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'certificateCourseId is required' },
      { status: 400, headers: frontCorsHeaders(origin) },
    );
  }

  const { certificateCourseId, unitId, lessonId, positionSeconds } = parsed.data;
  const watch = unitId && lessonId && positionSeconds != null
    ? { unitId, lessonId, positionSeconds }
    : undefined;

  const result = await touchCourseProgress(userId, certificateCourseId, watch);
  if (!result.ok) {
    return NextResponse.json(
      { code: 'NOT_FOUND', message: 'Certificate course not found' },
      { status: 404, headers: frontCorsHeaders(origin) },
    );
  }

  return NextResponse.json({ ok: true }, { headers: frontCorsHeaders(origin) });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders(request.headers.get('origin')) });
}

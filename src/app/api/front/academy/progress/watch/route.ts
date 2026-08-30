import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { frontCorsHeaders } from '@/lib/front-cors';
import { getCurrentUserId } from '@/server/auth/session';
import { getCourseWatchProgress } from '@/server/storefront/academy-home-tracking';

const querySchema = z.string().uuid();

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Authentication required' },
      { status: 401, headers: frontCorsHeaders(origin) },
    );
  }

  const certificateCourseId = request.nextUrl.searchParams.get('certificateCourseId')?.trim() ?? '';
  if (!querySchema.safeParse(certificateCourseId).success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'certificateCourseId is required' },
      { status: 400, headers: frontCorsHeaders(origin) },
    );
  }

  const watch = await getCourseWatchProgress(userId, certificateCourseId);
  return NextResponse.json({ watch }, { headers: frontCorsHeaders(origin) });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders(request.headers.get('origin')) });
}

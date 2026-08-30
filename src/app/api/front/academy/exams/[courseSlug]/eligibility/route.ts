import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { frontCorsHeaders } from '@/lib/front-cors';
import { getCurrentUserId } from '@/server/auth/session';
import { getExamEligibility } from '@/server/storefront/academy-exams';

type RouteContext = { params: Promise<{ courseSlug: string }> };

const idSchema = z.string().uuid();

export async function GET(request: NextRequest, context: RouteContext) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Authentication required' },
      { status: 401, headers: frontCorsHeaders() },
    );
  }

  const { courseSlug } = await context.params;
  const certificateCourseId = request.nextUrl.searchParams.get('certificateCourseId')?.trim() ?? '';
  if (!idSchema.safeParse(certificateCourseId).success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'certificateCourseId is required' },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  const locale = request.nextUrl.searchParams.get('locale')?.trim() || undefined;
  const result = await getExamEligibility(userId, courseSlug, certificateCourseId, locale);

  if (!result.ok) {
    return NextResponse.json(
      { code: result.code, message: 'Course not found' },
      { status: 404, headers: frontCorsHeaders() },
    );
  }

  return NextResponse.json(result, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}

import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getCurrentUserId } from '@/server/auth/session';
import { getCertificateExamAttemptResult } from '@/server/storefront/academy-exams';

type RouteContext = { params: Promise<{ attemptId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Authentication required' },
      { status: 401, headers: frontCorsHeaders() },
    );
  }

  const { attemptId } = await context.params;
  const certificateSlug = request.nextUrl.searchParams.get('certificateSlug')?.trim() ?? '';
  if (!certificateSlug) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'certificateSlug is required' },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  const locale = await resolveFrontRequestLocale(request);
  const result = await getCertificateExamAttemptResult(userId, attemptId, certificateSlug, locale);

  if (!result.ok) {
    return NextResponse.json(
      { code: result.code, message: 'Attempt not found' },
      { status: 404, headers: frontCorsHeaders() },
    );
  }

  return NextResponse.json(result, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}

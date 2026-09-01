import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getCurrentUserId } from '@/server/auth/session';
import { getCertificateExamEligibility } from '@/server/storefront/academy-exams';

type RouteContext = { params: Promise<{ certificateSlug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Authentication required' },
      { status: 401, headers: frontCorsHeaders() },
    );
  }

  const { certificateSlug } = await context.params;
  const locale = await resolveFrontRequestLocale(request);
  const result = await getCertificateExamEligibility(userId, certificateSlug, locale);

  if (!result.ok) {
    return NextResponse.json(
      { code: result.code, message: 'Certificate not found' },
      { status: 404, headers: frontCorsHeaders() },
    );
  }

  return NextResponse.json(result, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}

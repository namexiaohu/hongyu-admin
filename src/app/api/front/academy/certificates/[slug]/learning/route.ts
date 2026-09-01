import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getCurrentUserId } from '@/server/auth/session';
import { getCertificateLearningState } from '@/server/storefront/academy-certificate-learning';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Authentication required' },
      { status: 401, headers: frontCorsHeaders() },
    );
  }

  const { slug } = await context.params;
  const locale = await resolveFrontRequestLocale(request);
  const state = await getCertificateLearningState(userId, slug, locale);

  if (!state) {
    return NextResponse.json(
      { code: 'NOT_FOUND', message: 'Certificate not found' },
      { status: 404, headers: frontCorsHeaders() },
    );
  }

  return NextResponse.json(state, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}

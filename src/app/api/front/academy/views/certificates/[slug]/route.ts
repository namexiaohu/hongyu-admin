import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { getCurrentUserId } from '@/server/auth/session';
import { recordCertificateView } from '@/server/storefront/academy-home-tracking';

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get('origin');
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Authentication required' },
      { status: 401, headers: frontCorsHeaders(origin) },
    );
  }

  const { slug } = await context.params;
  const result = await recordCertificateView(userId, slug);
  if (!result.ok) {
    return NextResponse.json(
      { code: 'NOT_FOUND', message: 'Certificate not found' },
      { status: 404, headers: frontCorsHeaders(origin) },
    );
  }

  return NextResponse.json({ ok: true }, { headers: frontCorsHeaders(origin) });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders(request.headers.get('origin')) });
}

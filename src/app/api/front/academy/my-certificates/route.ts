import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { resolveFrontRequestLocale } from '@/lib/front-request-locale';
import { getCurrentUserId } from '@/server/auth/session';
import { listMyCertificates } from '@/server/storefront/academy-user-certificates';

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Authentication required' },
      { status: 401, headers: frontCorsHeaders(origin) },
    );
  }

  const locale = await resolveFrontRequestLocale(request);
  const result = await listMyCertificates(userId, locale);
  return NextResponse.json(result, { headers: frontCorsHeaders(origin) });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders(request.headers.get('origin')) });
}

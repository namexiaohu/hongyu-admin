import { NextRequest, NextResponse } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { getPublicCertificateByNumber } from '@/server/storefront/academy-user-certificates';

type RouteContext = { params: Promise<{ certificateNumber: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get('origin');
  const { certificateNumber } = await context.params;
  const decoded = decodeURIComponent(certificateNumber).trim();
  const cert = await getPublicCertificateByNumber(decoded);
  if (!cert) {
    return NextResponse.json(
      { code: 'NOT_FOUND', message: 'Certificate not found' },
      { status: 404, headers: frontCorsHeaders(origin) },
    );
  }
  return NextResponse.json(cert, { headers: frontCorsHeaders(origin) });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: frontCorsHeaders(request.headers.get('origin')),
  });
}

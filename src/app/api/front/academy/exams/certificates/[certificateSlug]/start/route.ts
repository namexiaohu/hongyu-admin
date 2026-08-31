import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { frontCorsHeaders } from '@/lib/front-cors';
import { getCurrentUserId } from '@/server/auth/session';
import { startCertificateExamAttempt } from '@/server/storefront/academy-exams';

type RouteContext = { params: Promise<{ certificateSlug: string }> };

const bodySchema = z.object({
  locale: z.string().trim().optional(),
});

export async function POST(request: NextRequest, context: RouteContext) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Authentication required' },
      { status: 401, headers: frontCorsHeaders() },
    );
  }

  const { certificateSlug } = await context.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid request body' },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  const locale = parsed.data.locale || request.nextUrl.searchParams.get('locale')?.trim() || undefined;
  const result = await startCertificateExamAttempt(userId, certificateSlug, locale);

  if (!result.ok) {
    const status = result.code === 'NOT_FOUND' ? 404 : 403;
    return NextResponse.json(
      { code: result.code, message: result.code },
      { status, headers: frontCorsHeaders() },
    );
  }

  return NextResponse.json(result, { status: 201, headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}

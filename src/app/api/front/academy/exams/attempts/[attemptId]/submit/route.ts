import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { frontCorsHeaders } from '@/lib/front-cors';
import { getCurrentUserId } from '@/server/auth/session';
import { submitExamAttempt } from '@/server/storefront/academy-exams';

const submitSchema = z.object({
  answers: z.record(z.union([z.number(), z.array(z.number()), z.boolean(), z.string()])),
  locale: z.string().optional(),
});

type RouteContext = { params: Promise<{ attemptId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Authentication required' },
      { status: 401, headers: frontCorsHeaders() },
    );
  }

  const { attemptId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400, headers: frontCorsHeaders() },
    );
  }

  const result = await submitExamAttempt(userId, attemptId, parsed.data.answers, parsed.data.locale);

  if (!result.ok) {
    const status = result.code === 'NOT_FOUND' ? 404 : result.code === 'ALREADY_SUBMITTED' ? 409 : 403;
    return NextResponse.json(
      { code: result.code, message: result.code },
      { status, headers: frontCorsHeaders() },
    );
  }

  return NextResponse.json(result, { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}

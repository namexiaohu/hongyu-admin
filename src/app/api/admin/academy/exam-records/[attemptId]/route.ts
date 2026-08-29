import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getAdminExamRecordDetail,
  updateAdminExamRecordMail,
} from '@/server/admin/academy-exam-records';

const patchSchema = z.object({
  certificateMailStatus: z.enum(['unsent', 'sent']).optional(),
  certificateMailFile: z.string().nullable().optional(),
});

type RouteContext = { params: Promise<{ attemptId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { attemptId } = await context.params;
  const detail = await getAdminExamRecordDetail(attemptId);
  if (!detail) {
    return NextResponse.json({ code: 'NOT_FOUND', message: '考试记录不存在' }, { status: 404 });
  }
  return NextResponse.json(detail);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { attemptId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await updateAdminExamRecordMail(attemptId, parsed.data);
  if (!updated) {
    return NextResponse.json({ code: 'NOT_FOUND', message: '考试记录不存在' }, { status: 404 });
  }
  return NextResponse.json(updated);
}

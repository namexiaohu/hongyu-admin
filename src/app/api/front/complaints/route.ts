import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { frontCorsHeaders } from '@/lib/front-cors';
import { createStorefrontComplaint } from '@/server/storefront/complaints';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || null);

const complaintSchema = z.object({
  fullName: optionalText(150),
  contact: optionalText(320),
  message: z.string().trim().min(1).max(8000),
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = complaintSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '请填写投诉或建议内容', details: parsed.error.flatten() },
        { status: 400, headers: frontCorsHeaders() },
      );
    }

    const created = await createStorefrontComplaint({
      fullName: parsed.data.fullName,
      contact: parsed.data.contact,
      message: parsed.data.message,
      sourcePageUrl: request.headers.get('referer'),
    });

    if (!created) {
      return NextResponse.json(
        { code: 'COMPLAINT_CREATE_FAILED', message: '暂时无法提交，请稍后再试。' },
        { status: 400, headers: frontCorsHeaders() },
      );
    }

    return NextResponse.json({ id: created.id }, { status: 201, headers: frontCorsHeaders() });
  } catch (error) {
    console.error('[front/complaints] create failed', error);
    return NextResponse.json(
      { code: 'COMPLAINT_CREATE_FAILED', message: '暂时无法提交，请稍后再试。' },
      { status: 500, headers: frontCorsHeaders() },
    );
  }
}

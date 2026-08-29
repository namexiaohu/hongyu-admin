import { NextRequest, NextResponse } from 'next/server';

import { adminAcademyQuestionBankCreateSchema } from '@/lib/academy-question-bank-content';
import {
  createAdminAcademyQuestionBank,
  getAdminAcademyQuestionBankList,
} from '@/server/admin/academy-question-banks';

export async function GET() {
  const list = await getAdminAcademyQuestionBankList();
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = adminAcademyQuestionBankCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const created = await createAdminAcademyQuestionBank(parsed.data);
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ code: 'CREATE_FAILED', message: '创建题库失败' }, { status: 400 });
  }
}

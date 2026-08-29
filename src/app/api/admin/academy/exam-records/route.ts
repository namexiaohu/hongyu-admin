import { NextRequest, NextResponse } from 'next/server';

import { getAdminExamRecordList } from '@/server/admin/academy-exam-records';

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get('keyword') ?? '';
  const passed = (request.nextUrl.searchParams.get('passed') ?? '') as 'true' | 'false' | '';
  const mailStatus = (request.nextUrl.searchParams.get('mailStatus') ?? '') as 'unsent' | 'sent' | '';
  const list = await getAdminExamRecordList({ keyword, passed, mailStatus });
  return NextResponse.json(list);
}

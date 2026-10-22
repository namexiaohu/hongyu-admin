import { NextRequest, NextResponse } from 'next/server';

import { parseComplaintHistoryListQuery } from '@/lib/complaint-list-query';
import { getAdminUserId } from '@/server/auth/bearer';
import { listHistoryAdminComplaints } from '@/server/admin/complaints';

export async function GET(request: NextRequest) {
  const adminId = await getAdminUserId();
  if (!adminId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Admin session required' }, { status: 401 });
  }

  const query = parseComplaintHistoryListQuery(Object.fromEntries(request.nextUrl.searchParams.entries()));
  const result = await listHistoryAdminComplaints(query);
  return NextResponse.json({
    items: result.items,
    meta: {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    },
  });
}

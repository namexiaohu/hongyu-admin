import { NextRequest, NextResponse } from 'next/server';

import { parseComplaintActiveListQuery } from '@/lib/complaint-list-query';
import { getAdminUserId } from '@/server/auth/bearer';
import { listActiveAdminComplaints } from '@/server/admin/complaints';

export async function GET(request: NextRequest) {
  const adminId = await getAdminUserId();
  if (!adminId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Admin session required' }, { status: 401 });
  }

  const query = parseComplaintActiveListQuery(Object.fromEntries(request.nextUrl.searchParams.entries()));
  const items = await listActiveAdminComplaints(query);
  return NextResponse.json({ items });
}

import { NextRequest, NextResponse } from 'next/server';

import { getAdminAcademyCoursePickerItems } from '@/server/admin/academy-courses';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { ids?: string[] };
  const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
  const items = await getAdminAcademyCoursePickerItems(ids);
  return NextResponse.json({ items });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { lookupAdminAcademyQuestionBanks, searchAdminAcademyQuestionBanks } from '@/server/admin/academy-question-banks';

const postSchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
  keyword: z.string().optional(),
  excludeIds: z.array(z.string().uuid()).optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload' }, { status: 400 });
  }

  if (parsed.data.ids?.length) {
    const items = await lookupAdminAcademyQuestionBanks(parsed.data.ids);
    return NextResponse.json({ items });
  }

  const items = await searchAdminAcademyQuestionBanks(parsed.data.keyword ?? '', parsed.data.excludeIds ?? []);
  return NextResponse.json({ items });
}

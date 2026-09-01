import { NextRequest } from 'next/server';

import {
  handleAdminUiStringsGet,
  handleAdminUiStringsPost,
  handleAdminUiStringsPut,
} from '@/server/admin/ui-strings-route-handlers';

const SITE = 'course' as const;

export async function GET(request: NextRequest) {
  return handleAdminUiStringsGet(SITE, request);
}

export async function PUT(request: NextRequest) {
  return handleAdminUiStringsPut(SITE, request);
}

export async function POST(request: NextRequest) {
  return handleAdminUiStringsPost(SITE, request);
}

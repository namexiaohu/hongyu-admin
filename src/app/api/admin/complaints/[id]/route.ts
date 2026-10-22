import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { deleteAdminComplaint, getAdminComplaintDetail, updateAdminComplaint } from '@/server/admin/complaints';
import { getAdminUserId } from '@/server/auth/bearer';

const patchSchema = z.object({
  status: z.enum(['new', 'contacted', 'closed']).optional(),
  internalNote: z.string().nullable().optional(),
});

async function requireAdmin() {
  const adminId = await getAdminUserId();
  if (!adminId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Admin session required' }, { status: 401 });
  }
  return null;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const complaint = await getAdminComplaintDetail(id);
  if (!complaint) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Complaint not found' }, { status: 404 });
  }

  return NextResponse.json(complaint);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const updated = await updateAdminComplaint({
    id,
    status: parsed.data.status,
    internalNote: parsed.data.internalNote,
  });
  if (!updated) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Complaint not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const deleted = await deleteAdminComplaint(id);
  if (!deleted) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Complaint not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

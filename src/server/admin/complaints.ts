import 'server-only';

import { and, asc, count, desc, eq, ilike, or } from 'drizzle-orm';

import { type AdminListPageSize, normalizePageSize } from '@/lib/admin-list-query';
import type {
  ComplaintActiveListQuery,
  ComplaintHistoryListQuery,
  ComplaintStatus,
} from '@/lib/complaint-list-query';
import { db } from '@/server/db';
import { admins, complaintMessages, complaints } from '@/server/db/schema';

export type AdminComplaintMessage = {
  id: string;
  complaintId: string;
  senderType: 'customer' | 'admin';
  adminId: string | null;
  adminName: string | null;
  body: string;
  createdAt: Date;
};

export type AdminComplaintListItem = {
  id: string;
  fullName: string | null;
  contact: string | null;
  message: string;
  status: ComplaintStatus;
  awaitingAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date | null;
  resolvedAt: Date | null;
};

export type AdminComplaintDetail = AdminComplaintListItem & {
  sourcePageUrl: string | null;
  internalNote: string | null;
  messages: AdminComplaintMessage[];
};

export type AdminComplaintHistoryPage = {
  items: AdminComplaintListItem[];
  total: number;
  page: number;
  pageSize: AdminListPageSize;
};

function buildKeywordWhere(keyword: string) {
  const trimmed = keyword.trim();
  if (!trimmed) return undefined;
  const pattern = `%${trimmed}%`;
  return or(
    ilike(complaints.fullName, pattern),
    ilike(complaints.contact, pattern),
    ilike(complaints.message, pattern),
  );
}

function buildActiveWhere(query: ComplaintActiveListQuery) {
  const filters = [eq(complaints.awaitingAdmin, true)];
  const keywordWhere = buildKeywordWhere(query.keyword);
  if (keywordWhere) filters.push(keywordWhere);
  if (query.status) filters.push(eq(complaints.status, query.status));
  return and(...filters);
}

function buildHistoryWhere(query: ComplaintHistoryListQuery) {
  const filters = [eq(complaints.awaitingAdmin, false)];
  const keywordWhere = buildKeywordWhere(query.keyword);
  if (keywordWhere) filters.push(keywordWhere);
  if (query.status) filters.push(eq(complaints.status, query.status));
  return and(...filters);
}

function mapListRow(row: typeof complaints.$inferSelect): AdminComplaintListItem {
  return {
    id: row.id,
    fullName: row.fullName,
    contact: row.contact,
    message: row.message,
    status: row.status,
    awaitingAdmin: row.awaitingAdmin,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastMessageAt: row.lastMessageAt,
    resolvedAt: row.resolvedAt,
  };
}

async function loadMessages(complaintId: string): Promise<AdminComplaintMessage[]> {
  const rows = await db
    .select({
      id: complaintMessages.id,
      complaintId: complaintMessages.complaintId,
      senderType: complaintMessages.senderType,
      adminId: complaintMessages.adminId,
      adminName: admins.name,
      body: complaintMessages.body,
      createdAt: complaintMessages.createdAt,
    })
    .from(complaintMessages)
    .leftJoin(admins, eq(admins.id, complaintMessages.adminId))
    .where(eq(complaintMessages.complaintId, complaintId))
    .orderBy(asc(complaintMessages.createdAt));

  return rows.map((row) => ({
    ...row,
    senderType: row.senderType as 'customer' | 'admin',
    adminName: row.adminName ?? null,
  }));
}

export async function listActiveAdminComplaints(query: ComplaintActiveListQuery) {
  const rows = await db
    .select()
    .from(complaints)
    .where(buildActiveWhere(query))
    .orderBy(desc(complaints.createdAt));

  return rows.map(mapListRow);
}

export async function listHistoryAdminComplaints(query: ComplaintHistoryListQuery): Promise<AdminComplaintHistoryPage> {
  const page = Math.max(1, query.page);
  const pageSize = normalizePageSize(query.pageSize);
  const whereClause = buildHistoryWhere(query);

  const [totalRow] = await db.select({ value: count() }).from(complaints).where(whereClause);
  const total = Number(totalRow?.value ?? 0);
  const offset = (page - 1) * pageSize;

  const rows = await db
    .select()
    .from(complaints)
    .where(whereClause)
    .orderBy(desc(complaints.updatedAt), desc(complaints.createdAt))
    .limit(pageSize)
    .offset(offset);

  return {
    items: rows.map(mapListRow),
    total,
    page,
    pageSize,
  };
}

export async function getAdminComplaintDetail(id: string): Promise<AdminComplaintDetail | null> {
  const [row] = await db.select().from(complaints).where(eq(complaints.id, id)).limit(1);
  if (!row) return null;

  return {
    ...mapListRow(row),
    sourcePageUrl: row.sourcePageUrl,
    internalNote: row.internalNote,
    messages: await loadMessages(id),
  };
}

export async function updateAdminComplaint(input: {
  id: string;
  status?: ComplaintStatus;
  internalNote?: string | null;
}) {
  const [existing] = await db.select({ id: complaints.id }).from(complaints).where(eq(complaints.id, input.id)).limit(1);
  if (!existing) return null;

  const now = new Date();
  const nextUpdate: {
    status?: ComplaintStatus;
    internalNote?: string | null;
    awaitingAdmin?: boolean;
    resolvedAt?: Date | null;
    updatedAt: Date;
  } = { updatedAt: now };

  if (typeof input.status !== 'undefined') {
    nextUpdate.status = input.status;
    if (input.status === 'new') {
      nextUpdate.awaitingAdmin = true;
      nextUpdate.resolvedAt = null;
    } else if (input.status === 'closed') {
      nextUpdate.awaitingAdmin = false;
      nextUpdate.resolvedAt = now;
    } else {
      nextUpdate.awaitingAdmin = false;
      nextUpdate.resolvedAt = null;
    }
  }

  if (typeof input.internalNote !== 'undefined') {
    nextUpdate.internalNote = input.internalNote?.trim() ? input.internalNote.trim() : null;
  }

  await db.update(complaints).set(nextUpdate).where(eq(complaints.id, input.id));
  return getAdminComplaintDetail(input.id);
}

export async function replyAdminComplaint(id: string, adminId: string, body: string) {
  const trimmedBody = body.trim();
  if (!trimmedBody) return null;

  const [existing] = await db
    .select({ id: complaints.id, status: complaints.status })
    .from(complaints)
    .where(eq(complaints.id, id))
    .limit(1);
  if (!existing) return null;

  const now = new Date();
  await db.insert(complaintMessages).values({
    complaintId: id,
    senderType: 'admin',
    adminId,
    body: trimmedBody,
  });

  await db
    .update(complaints)
    .set({
      awaitingAdmin: false,
      lastMessageAt: now,
      status: existing.status === 'new' ? 'contacted' : existing.status,
      updatedAt: now,
    })
    .where(eq(complaints.id, id));

  return getAdminComplaintDetail(id);
}

export async function deleteAdminComplaint(id: string) {
  const [deleted] = await db.delete(complaints).where(eq(complaints.id, id)).returning({ id: complaints.id });
  return Boolean(deleted);
}

import { notFound } from 'next/navigation';

import { resolveComplaintDetailBack } from '@/lib/complaint-list-query';
import { getAdminComplaintDetail } from '@/server/admin/complaints';

import { ComplaintDetailClient } from '../complaint-detail-client';

export default async function AdminComplaintDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const urlSearchParams = await searchParams;
  const complaint = await getAdminComplaintDetail(id);
  if (!complaint) notFound();

  return (
    <ComplaintDetailClient
      backTarget={resolveComplaintDetailBack(urlSearchParams, { awaitingAdmin: complaint.awaitingAdmin })}
      initialComplaint={{
        id: complaint.id,
        fullName: complaint.fullName,
        contact: complaint.contact,
        message: complaint.message,
        status: complaint.status,
        awaitingAdmin: complaint.awaitingAdmin,
        createdAt: complaint.createdAt.toISOString(),
        sourcePageUrl: complaint.sourcePageUrl,
        internalNote: complaint.internalNote,
        resolvedAt: complaint.resolvedAt?.toISOString() ?? null,
        messages: complaint.messages.map((item) => ({
          id: item.id,
          senderType: item.senderType,
          adminName: item.adminName,
          body: item.body,
          createdAt: item.createdAt.toISOString(),
        })),
      }}
    />
  );
}

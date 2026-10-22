import { ComplaintActiveListClient } from '@/components/complaints/complaint-active-list-client';
import { parseComplaintActiveListQuery } from '@/lib/complaint-list-query';
import { listActiveAdminComplaints } from '@/server/admin/complaints';

export default async function AdminComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = parseComplaintActiveListQuery(params);
  const items = await listActiveAdminComplaints(query);

  return <ComplaintActiveListClient initialItems={items} initialQuery={query} />;
}

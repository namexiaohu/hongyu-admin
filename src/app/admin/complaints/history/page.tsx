import { ComplaintHistoryListClient } from '@/components/complaints/complaint-history-list-client';
import { parseComplaintHistoryListQuery } from '@/lib/complaint-list-query';
import { listHistoryAdminComplaints } from '@/server/admin/complaints';

export default async function AdminComplaintHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = parseComplaintHistoryListQuery(params);
  const result = await listHistoryAdminComplaints(query);

  return (
    <ComplaintHistoryListClient
      initialList={{
        items: result.items,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      }}
      initialQuery={query}
    />
  );
}

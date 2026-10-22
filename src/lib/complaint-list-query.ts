import {
  ADMIN_LIST_DEFAULT_PAGE_SIZE,
  ADMIN_LIST_PAGE_SIZE_OPTIONS,
  type AdminListPageSize,
  normalizePageSize,
} from '@/lib/admin-list-query';

export type ComplaintStatus = 'new' | 'contacted' | 'closed';

export type ComplaintActiveListQuery = {
  keyword: string;
  status: ComplaintStatus | '';
};

export type ComplaintHistoryListQuery = {
  page: number;
  pageSize: AdminListPageSize;
  keyword: string;
  status: ComplaintStatus | '';
};

function parsePositiveInt(value: string | null | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

function pick(searchParams: Record<string, string | string[] | undefined>, key: string) {
  const raw = searchParams[key];
  return (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? '';
}

function parseStatus(value: string): ComplaintStatus | '' {
  return value === 'new' || value === 'contacted' || value === 'closed' ? value : '';
}

export function parseComplaintActiveListQuery(
  searchParams: Record<string, string | string[] | undefined>,
): ComplaintActiveListQuery {
  return {
    keyword: pick(searchParams, 'keyword'),
    status: parseStatus(pick(searchParams, 'status')),
  };
}

export function parseComplaintHistoryListQuery(
  searchParams: Record<string, string | string[] | undefined>,
  options?: { storedPageSize?: AdminListPageSize | null },
): ComplaintHistoryListQuery {
  const rawPageSize = searchParams.page_size;
  const pageSizeFromUrl = Array.isArray(rawPageSize) ? rawPageSize[0] : rawPageSize;
  const pageSize = pageSizeFromUrl
    ? normalizePageSize(pageSizeFromUrl)
    : normalizePageSize(options?.storedPageSize ?? ADMIN_LIST_DEFAULT_PAGE_SIZE);

  const rawPage = searchParams.page;
  const pageValue = Array.isArray(rawPage) ? rawPage[0] : rawPage;

  return {
    page: parsePositiveInt(pageValue, 1),
    pageSize,
    keyword: pick(searchParams, 'keyword'),
    status: parseStatus(pick(searchParams, 'status')),
  };
}

export function buildComplaintActiveListQueryString(params: Partial<ComplaintActiveListQuery>) {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.status) query.set('status', params.status);
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export function buildComplaintHistoryListQueryString(params: Partial<ComplaintHistoryListQuery>) {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.status) query.set('status', params.status);
  if (params.page && params.page > 1) query.set('page', String(params.page));
  if (params.pageSize && params.pageSize !== ADMIN_LIST_DEFAULT_PAGE_SIZE) {
    query.set('page_size', String(params.pageSize));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export function buildComplaintActiveListUrl(basePath: string, params: Partial<ComplaintActiveListQuery>) {
  return `${basePath}${buildComplaintActiveListQueryString(params)}`;
}

export function buildComplaintHistoryListUrl(basePath: string, params: Partial<ComplaintHistoryListQuery>) {
  return `${basePath}${buildComplaintHistoryListQueryString(params)}`;
}

export type ComplaintDetailFrom = 'active' | 'history';

function appendListQueryParams(target: URLSearchParams, serialized: string) {
  if (!serialized) return;
  const source = new URLSearchParams(serialized.startsWith('?') ? serialized.slice(1) : serialized);
  source.forEach((value, key) => {
    if (key !== 'from') target.set(key, value);
  });
}

export function buildComplaintDetailUrl(
  id: string,
  from: ComplaintDetailFrom,
  listQuery?: Partial<ComplaintActiveListQuery> | Partial<ComplaintHistoryListQuery>,
) {
  const params = new URLSearchParams();
  params.set('from', from);

  if (from === 'active') {
    appendListQueryParams(params, buildComplaintActiveListQueryString(listQuery as Partial<ComplaintActiveListQuery>));
  } else {
    appendListQueryParams(params, buildComplaintHistoryListQueryString(listQuery as Partial<ComplaintHistoryListQuery>));
  }

  const serialized = params.toString();
  return `/admin/complaints/${id}${serialized ? `?${serialized}` : ''}`;
}

export function resolveComplaintDetailBack(
  searchParams: Record<string, string | string[] | undefined>,
  fallback?: { awaitingAdmin?: boolean },
) {
  const from = pick(searchParams, 'from');
  const resolvedFrom: ComplaintDetailFrom = from === 'history'
    ? 'history'
    : from === 'active'
      ? 'active'
      : fallback?.awaitingAdmin === false
        ? 'history'
        : 'active';

  if (resolvedFrom === 'history') {
    return {
      href: buildComplaintHistoryListUrl('/admin/complaints/history', parseComplaintHistoryListQuery(searchParams)),
      label: '返回历史投诉建议',
    };
  }

  return {
    href: buildComplaintActiveListUrl('/admin/complaints', parseComplaintActiveListQuery(searchParams)),
    label: '返回待处理',
  };
}

export { ADMIN_LIST_PAGE_SIZE_OPTIONS, ADMIN_LIST_DEFAULT_PAGE_SIZE };

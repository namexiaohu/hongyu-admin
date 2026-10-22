'use client';

import { DeleteOutlined, RightOutlined } from '@ant-design/icons';
import { Input, Select, Space, Tag, message } from 'antd';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { AdminConfirmActionIconButton } from '@/components/admin/admin-row-actions';
import { ComplaintViewSwitch } from '@/components/complaints/complaint-view-switch';
import { formatAdminDate } from '@/lib/admin-display';
import {
  buildComplaintActiveListUrl,
  buildComplaintDetailUrl,
  parseComplaintActiveListQuery,
  type ComplaintActiveListQuery,
} from '@/lib/complaint-list-query';
import {
  complaintDisplayContact,
  complaintDisplayName,
  complaintExcerpt,
  complaintStatusColors,
  complaintStatusLabels,
  complaintStatusOptions,
} from '@/lib/complaint-display';
import type { AdminComplaintListItem } from '@/server/admin/complaints';

type ComplaintActiveListClientProps = {
  initialItems: AdminComplaintListItem[];
  initialQuery: ComplaintActiveListQuery;
};

async function fetchActiveComplaints(query: ComplaintActiveListQuery) {
  const params = new URLSearchParams();
  if (query.keyword) params.set('keyword', query.keyword);
  if (query.status) params.set('status', query.status);

  const response = await fetch(`/api/admin/complaints/active?${params.toString()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error('加载待处理投诉建议失败');
  const payload = (await response.json()) as { items: AdminComplaintListItem[] };
  return payload.items;
}

export function ComplaintActiveListClient({ initialItems, initialQuery }: ComplaintActiveListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMountRef = useRef(true);

  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery.keyword);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const replaceUrl = useCallback((nextQuery: ComplaintActiveListQuery) => {
    router.replace(buildComplaintActiveListUrl('/admin/complaints', nextQuery), { scroll: false });
  }, [router]);

  const reload = useCallback((nextQuery: ComplaintActiveListQuery) => {
    startTransition(async () => {
      const nextItems = await fetchActiveComplaints(nextQuery);
      setItems(nextItems);
      setQuery(nextQuery);
    });
  }, []);

  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }
    const urlQuery = parseComplaintActiveListQuery(Object.fromEntries(searchParams.entries()));
    setSearchInput(urlQuery.keyword);
    reload(urlQuery);
  }, [searchParams, reload]);

  function applyQueryChange(patch: Partial<ComplaintActiveListQuery>) {
    const nextQuery: ComplaintActiveListQuery = {
      keyword: patch.keyword ?? query.keyword,
      status: patch.status ?? query.status,
    };
    setSearchInput(nextQuery.keyword);
    replaceUrl(nextQuery);
  }

  async function deleteComplaint(id: string) {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/admin/complaints/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        void message.error('删除失败');
        return;
      }
      void message.success('已删除');
      setItems((current) => current.filter((item) => item.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main style={{ display: 'grid', gap: 20 }}>
      <div>
        <h1 style={{ margin: 0 }}>投诉建议</h1>
      </div>
      <ComplaintViewSwitch current="active" activeCount={items.length} />
      <Space wrap>
        <Input.Search
          allowClear
          placeholder="搜索姓名、联系方式、内容"
          style={{ width: 320 }}
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onSearch={(value) => applyQueryChange({ keyword: value.trim() })}
        />
        <Select
          allowClear
          placeholder="状态"
          style={{ width: 140 }}
          value={query.status || undefined}
          options={complaintStatusOptions}
          onChange={(value) => applyQueryChange({ status: value ?? '' })}
        />
      </Space>
      {items.length === 0 ? (
        <div style={{ color: 'rgba(0,0,0,0.45)' }}>暂无待处理投诉建议</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {items.map((item) => (
            <div key={item.id} className="inquiry-active-card-wrap">
              <Link href={buildComplaintDetailUrl(item.id, 'active', query)} className="inquiry-active-card-link">
                <article className="info-card inquiry-active-card">
                  <div className="inquiry-active-card__header">
                    <h2 className="inquiry-active-card__title">{complaintExcerpt(item.message)}</h2>
                    <Tag color={complaintStatusColors[item.status]}>{complaintStatusLabels[item.status]}</Tag>
                  </div>
                  <p className="inquiry-active-card__meta">
                    {complaintDisplayName(item.fullName)} · {complaintDisplayContact(item.contact)}
                  </p>
                  <div className="inquiry-active-card__footer">
                    <span className="inquiry-active-card__action">
                      <span>查看详情</span>
                      <RightOutlined />
                    </span>
                    <p className="inquiry-active-card__meta inquiry-active-card__meta--footer">
                      提交时间：{formatAdminDate(item.createdAt)}
                    </p>
                  </div>
                </article>
              </Link>
              <div className="inquiry-active-card__delete">
                <AdminConfirmActionIconButton
                  title="删除"
                  icon={<DeleteOutlined />}
                  danger
                  loading={deletingId === item.id}
                  confirmTitle="确定删除该投诉建议吗？"
                  confirmDescription="删除后不可恢复，相关回复将一并清除。"
                  okText="删除"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => deleteComplaint(item.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

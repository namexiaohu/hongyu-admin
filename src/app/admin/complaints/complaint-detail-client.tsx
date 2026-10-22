'use client';

import { Button, Card, Input, Select, Space, Tag, Typography, message } from 'antd';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { formatAdminDate } from '@/lib/admin-display';
import type { ComplaintStatus } from '@/lib/complaint-list-query';
import {
  complaintDisplayContact,
  complaintDisplayName,
  complaintStatusColors,
  complaintStatusLabels,
  complaintStatusOptions,
} from '@/lib/complaint-display';

export type ComplaintDetailView = {
  id: string;
  fullName: string | null;
  contact: string | null;
  message: string;
  status: ComplaintStatus;
  awaitingAdmin: boolean;
  createdAt: string;
  sourcePageUrl: string | null;
  internalNote: string | null;
  resolvedAt: string | null;
  messages: Array<{
    id: string;
    senderType: 'customer' | 'admin';
    adminName: string | null;
    body: string;
    createdAt: string;
  }>;
};

type ComplaintDetailClientProps = {
  backTarget: { href: string; label: string };
  initialComplaint: ComplaintDetailView;
};

export function ComplaintDetailClient({ backTarget, initialComplaint }: ComplaintDetailClientProps) {
  const router = useRouter();
  const [complaint, setComplaint] = useState(initialComplaint);
  const [note, setNote] = useState(initialComplaint.internalNote ?? '');
  const [reply, setReply] = useState('');
  const [saving, setSaving] = useState(false);
  const [replying, setReplying] = useState(false);

  async function savePatch(payload: { status?: ComplaintStatus; internalNote?: string | null }) {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/complaints/${complaint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        void message.error('保存失败');
        return;
      }
      const next = (await response.json()) as ComplaintDetailView;
      setComplaint({
        ...next,
        createdAt: String(next.createdAt),
        resolvedAt: next.resolvedAt ? String(next.resolvedAt) : null,
        messages: next.messages.map((item) => ({ ...item, createdAt: String(item.createdAt) })),
      });
      setNote(next.internalNote ?? '');
      void message.success('已保存');
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function submitReply() {
    const body = reply.trim();
    if (!body) return;
    setReplying(true);
    try {
      const response = await fetch(`/api/admin/complaints/${complaint.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (!response.ok) {
        void message.error('回复失败');
        return;
      }
      const next = (await response.json()) as ComplaintDetailView;
      setComplaint({
        ...next,
        createdAt: String(next.createdAt),
        resolvedAt: next.resolvedAt ? String(next.resolvedAt) : null,
        messages: next.messages.map((item) => ({ ...item, createdAt: String(item.createdAt) })),
      });
      setReply('');
      void message.success('已回复，并移入历史');
      router.refresh();
    } finally {
      setReplying(false);
    }
  }

  return (
    <main style={{ display: 'grid', gap: 16, maxWidth: 880 }}>
      <Link href={backTarget.href}>{backTarget.label}</Link>
      <Space align="center" wrap>
        <h1 style={{ margin: 0 }}>投诉建议详情</h1>
        <Tag color={complaintStatusColors[complaint.status]}>{complaintStatusLabels[complaint.status]}</Tag>
      </Space>
      <Card>
        <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 12 }}>{complaint.message}</Typography.Paragraph>
        <Typography.Text type="secondary">
          {complaintDisplayName(complaint.fullName)} · {complaintDisplayContact(complaint.contact)} · 提交于 {formatAdminDate(complaint.createdAt)}
        </Typography.Text>
        {complaint.sourcePageUrl ? (
          <div style={{ marginTop: 8 }}>
            <Typography.Text type="secondary">来源：{complaint.sourcePageUrl}</Typography.Text>
          </div>
        ) : null}
      </Card>
      <Card title="处理">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <div style={{ marginBottom: 8 }}>状态</div>
            <Select
              style={{ width: 180 }}
              value={complaint.status}
              options={complaintStatusOptions}
              onChange={(value) => savePatch({ status: value })}
              loading={saving}
            />
          </div>
          <div>
            <div style={{ marginBottom: 8 }}>内部备注</div>
            <Input.TextArea rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
            <Button style={{ marginTop: 8 }} loading={saving} onClick={() => savePatch({ internalNote: note })}>
              保存备注
            </Button>
          </div>
        </Space>
      </Card>
      <Card title="回复记录">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {complaint.messages.length === 0 ? <Typography.Text type="secondary">还没有回复</Typography.Text> : null}
          {complaint.messages.map((item) => (
            <div key={item.id}>
              <Typography.Text strong>{item.senderType === 'admin' ? item.adminName || '管理员' : '提交人'}</Typography.Text>
              <Typography.Text type="secondary"> · {formatAdminDate(item.createdAt)}</Typography.Text>
              <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{item.body}</Typography.Paragraph>
            </div>
          ))}
          <Input.TextArea rows={4} value={reply} placeholder="写下回复" onChange={(event) => setReply(event.target.value)} />
          <Button type="primary" loading={replying} onClick={submitReply}>
            发送回复
          </Button>
        </Space>
      </Card>
    </main>
  );
}

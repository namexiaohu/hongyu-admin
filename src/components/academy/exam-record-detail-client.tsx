'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, Card, Descriptions, Select, Space, Table, Tag, Upload, message } from 'antd';

import type { AdminExamRecordDetail } from '@/lib/academy-exam-record-detail';
import { formatAdminDate } from '@/lib/admin-display';
import { uploadMediaFile } from '@/lib/media-upload';

type Props = { initialDetail: AdminExamRecordDetail };

function formatAnswer(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

export function ExamRecordDetailClient({ initialDetail }: Props) {
  const [detail, setDetail] = useState(initialDetail);
  const [saving, setSaving] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/academy/exam-records/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error('保存失败');
      const next = (await response.json()) as AdminExamRecordDetail;
      setDetail(next);
      message.success('已保存');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        title="考试记录详情"
        extra={<Link href="/admin/academy/exam-records">返回列表</Link>}
      >
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="学员">{detail.user.name}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{detail.user.email}</Descriptions.Item>
          <Descriptions.Item label="课程">{detail.courseTitle}</Descriptions.Item>
          <Descriptions.Item label="考试">{detail.examTitle || '—'}</Descriptions.Item>
          <Descriptions.Item label="得分">
            {detail.score} / {detail.totalScore} ({detail.scorePercent}%)
          </Descriptions.Item>
          <Descriptions.Item label="结果">
            {detail.passed ? <Tag color="#00b81e">通过</Tag> : <Tag color="#ee1d36">未通过</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="开始时间">{formatAdminDate(detail.startedAt)}</Descriptions.Item>
          <Descriptions.Item label="交卷时间">{formatAdminDate(detail.submittedAt)}</Descriptions.Item>
          <Descriptions.Item label="证书编号">{detail.certificateNumber ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="发证时间">
            {detail.certificateIssuedAt ? formatAdminDate(detail.certificateIssuedAt) : '—'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="人工发证书（非公开验证 PDF）">
        <Space wrap>
          <Select
            style={{ width: 160 }}
            value={detail.certificateMailStatus}
            disabled={saving}
            options={[
              { value: 'unsent', label: '未发' },
              { value: 'sent', label: '已发' },
            ]}
            onChange={(value) => void patch({ certificateMailStatus: value })}
          />
          <Upload
            showUploadList={false}
            beforeUpload={async (file) => {
              try {
                const uploaded = await uploadMediaFile(file, {
                  kind: 'document',
                  folder: 'academy/certificate-mail',
                });
                await patch({ certificateMailFile: uploaded.key || uploaded.url });
              } catch (error) {
                message.error(error instanceof Error ? error.message : '上传失败');
              }
              return false;
            }}
          >
            <Button loading={saving}>上传证书文件</Button>
          </Upload>
          {detail.certificateMailFileUrl ? (
            <>
              <a href={detail.certificateMailFileUrl} target="_blank" rel="noreferrer">
                查看文件
              </a>
              <Button
                danger
                loading={saving}
                onClick={() => void patch({ certificateMailFile: null })}
              >
                清空文件
              </Button>
            </>
          ) : null}
        </Space>
        {detail.certificateMailUpdatedAt ? (
          <div style={{ marginTop: 12, color: '#888' }}>
            最近更新：{formatAdminDate(detail.certificateMailUpdatedAt)}
          </div>
        ) : null}
      </Card>

      <Card title="答题回顾">
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={detail.review}
          columns={[
            { title: '#', dataIndex: 'index', width: 56 },
            {
              title: '结果',
              dataIndex: 'isCorrect',
              width: 80,
              render: (v: boolean) =>
                v ? <Tag color="#00b81e">对</Tag> : <Tag color="#ee1d36">错</Tag>,
            },
            { title: '题干', dataIndex: 'prompt', ellipsis: true },
            {
              title: '学员答案',
              dataIndex: 'userAnswer',
              render: (v: unknown) => formatAnswer(v),
            },
            { title: '分值', dataIndex: 'score', width: 64 },
          ]}
        />
      </Card>
    </Space>
  );
}

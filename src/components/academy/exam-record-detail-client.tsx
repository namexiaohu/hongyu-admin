'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, Card, Descriptions, Select, Space, Table, Tag, Upload, message } from 'antd';

import type { AdminExamRecordDetail } from '@/lib/academy-exam-record-detail';
import { formatAdminDate } from '@/lib/admin-display';
import { resolveMediaUploadKind, uploadMediaFile } from '@/lib/media-upload';

type Props = { initialDetail: AdminExamRecordDetail };

const CERTIFICATE_MAIL_ACCEPT = '.pdf,application/pdf,image/jpeg,image/png,image/gif,image/webp,image/svg+xml';

function formatAnswer(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

function fileNameFromStorageRef(ref: string | null) {
  if (!ref) return '';
  const raw = ref.split('/').pop() ?? ref;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function isImageStorageRef(ref: string | null) {
  if (!ref) return false;
  return /\.(avif|gif|jpe?g|png|svg|webp)(\?|$)/i.test(ref);
}

export function ExamRecordDetailClient({ initialDetail }: Props) {
  const [detail, setDetail] = useState(initialDetail);
  const [statusSaving, setStatusSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);

  async function saveDetail(body: Record<string, unknown>) {
    const response = await fetch(`/api/admin/academy/exam-records/${detail.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('保存失败');
    const next = (await response.json()) as AdminExamRecordDetail;
    setDetail(next);
    message.success('已保存');
  }

  async function patchMailStatus(value: 'unsent' | 'sent') {
    setStatusSaving(true);
    try {
      await saveDetail({ certificateMailStatus: value });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setStatusSaving(false);
    }
  }

  const mailFileName = fileNameFromStorageRef(detail.certificateMailFile);
  const mailFileIsImage = isImageStorageRef(detail.certificateMailFile ?? detail.certificateMailFileUrl);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        title="考试记录详情"
        extra={<Link href="/admin/academy/exam-records">返回列表</Link>}
      >
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="学员">{detail.user.name}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{detail.user.email}</Descriptions.Item>
          <Descriptions.Item label="证书">{detail.certificateTitle || detail.courseTitle || '—'}</Descriptions.Item>
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

      <Card title="人工发证书（非公开验证 PDF / 图片）">
        <Space wrap align="start">
          <Select
            style={{ width: 160 }}
            value={detail.certificateMailStatus}
            loading={statusSaving}
            disabled={statusSaving}
            options={[
              { value: 'unsent', label: '未发' },
              { value: 'sent', label: '已发' },
            ]}
            onChange={(value) => void patchMailStatus(value)}
          />
          <Upload
            showUploadList={false}
            accept={CERTIFICATE_MAIL_ACCEPT}
            beforeUpload={async (file) => {
              const kind = resolveMediaUploadKind(file.type);
              if (kind !== 'document' && kind !== 'image') {
                message.error('仅支持 PDF 或图片文件');
                return Upload.LIST_IGNORE;
              }
              setUploading(true);
              try {
                const uploaded = await uploadMediaFile(file, {
                  kind,
                  folder: 'academy/certificate-mail',
                });
                await saveDetail({ certificateMailFile: uploaded.key || uploaded.url });
              } catch (error) {
                message.error(error instanceof Error ? error.message : '上传失败');
              } finally {
                setUploading(false);
              }
              return false;
            }}
          >
            <Button loading={uploading} disabled={uploading}>
              上传证书文件
            </Button>
          </Upload>
          {detail.certificateMailFileUrl ? (
            <Button
              danger
              loading={clearing}
              disabled={clearing || uploading}
              onClick={() => {
                setClearing(true);
                void saveDetail({ certificateMailFile: null })
                  .catch((error) => {
                    message.error(error instanceof Error ? error.message : '保存失败');
                  })
                  .finally(() => setClearing(false));
              }}
            >
              清空文件
            </Button>
          ) : null}
        </Space>

        {detail.certificateMailFileUrl ? (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
            {mailFileIsImage ? (
              <img
                src={detail.certificateMailFileUrl}
                alt={mailFileName || '已上传证书'}
                style={{ maxWidth: 320, maxHeight: 240, border: '1px solid #ebebeb', borderRadius: 8 }}
              />
            ) : null}
            <Space wrap>
              <span style={{ color: '#666' }}>已上传：</span>
              <a href={detail.certificateMailFileUrl} target="_blank" rel="noreferrer">
                {mailFileName || '查看文件'}
              </a>
            </Space>
          </div>
        ) : null}

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

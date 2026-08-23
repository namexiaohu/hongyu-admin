'use client';

import { DeleteOutlined, RightOutlined } from '@ant-design/icons';
import Link from 'next/link';

import { AdminConfirmActionIconButton } from '@/components/admin/admin-row-actions';
import {
  formatAdminDate,
  inquiryQueueKindColors,
  inquiryQueueKindLabels,
} from '@/lib/admin-display';
import { buildInquiryDetailUrl, type InquiryActiveListQuery } from '@/lib/inquiry-list-query';
import type { AdminInquiryListItem } from '@/server/admin/inquiries';

type InquiryActiveCardProps = {
  inquiry: AdminInquiryListItem;
  listQuery?: InquiryActiveListQuery;
  deleting?: boolean;
  onDelete: (id: string) => void;
};

export function InquiryActiveCard({
  inquiry,
  listQuery,
  deleting = false,
  onDelete,
}: InquiryActiveCardProps) {
  const queueLabel = inquiry.queueKind ? inquiryQueueKindLabels[inquiry.queueKind] : '待处理';
  const queueColor = inquiry.queueKind ? inquiryQueueKindColors[inquiry.queueKind] : 'gold';
  const contactInquiry = inquiry.inquiryKind === 'contact';
  const title = inquiry.projectName || (contactInquiry ? 'Contact' : inquiry.productName);
  const contactLine = `${inquiry.fullName} · ${inquiry.email}`;
  const companyLine = [inquiry.company, inquiry.country].filter(Boolean).join(' · ') || '未填写公司信息的游客提交';
  const contactSuffix = contactInquiry ? ' · 无商品询盘' : '';
  const timeLine = `最后消息：${formatAdminDate(inquiry.lastMessageAt ?? inquiry.createdAt)}`;
  const href = buildInquiryDetailUrl(inquiry.id, 'active', listQuery);

  return (
    <div className="inquiry-active-card-wrap">
      <Link href={href} className="inquiry-active-card-link">
        <article className="info-card inquiry-active-card">
          <div className="inquiry-active-card__header">
            <h2 className="inquiry-active-card__title">{title}</h2>
            <div className="inquiry-active-card__tags">
              {inquiry.inquiryType ? (
                <span className="inquiry-active-card__type">{inquiry.inquiryType}</span>
              ) : null}
              <span className="product-badge" data-color={queueColor}>
                {queueLabel}
              </span>
            </div>
          </div>
          <p className="inquiry-active-card__meta">{contactLine}</p>
          <div className="inquiry-active-card__footer">
            <span className="inquiry-active-card__action">
              <span>查看详情</span>
              <RightOutlined />
            </span>
            <p className="inquiry-active-card__meta inquiry-active-card__meta--footer">
              {companyLine}{contactSuffix} · {timeLine}
            </p>
          </div>
        </article>
      </Link>
      <div className="inquiry-active-card__delete">
        <AdminConfirmActionIconButton
          title="删除"
          icon={<DeleteOutlined />}
          danger
          loading={deleting}
          confirmTitle="确定删除该询盘吗？"
          confirmDescription="删除后不可恢复，相关消息与资料将一并清除。"
          okText="删除"
          okButtonProps={{ danger: true }}
          onConfirm={() => onDelete(inquiry.id)}
        />
      </div>
    </div>
  );
}

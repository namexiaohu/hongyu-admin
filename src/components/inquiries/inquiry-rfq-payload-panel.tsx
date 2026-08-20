'use client';

import type { ReactNode } from 'react';

import { StoredCountryLabel } from '@/components/geo/stored-country-label';
import { formatCustomerIndustryLabel } from '@/lib/customer-industries';
import {
  emptyInquiryProfile,
  isContactInquiry,
  type InquiryProfile,
  type InquiryQuotedLine,
  type InquiryRfqPayload,
} from '@/lib/inquiry-rfq';

type InquiryRfqPayloadPanelProps = {
  profile?: InquiryProfile | null;
  rfqPayload: InquiryRfqPayload | null;
};

function FactRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="inquiry-detail-fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function displayValue(value: string) {
  return value.trim() || '未填写';
}

export function InquiryRfqPayloadPanel({
  profile,
  rfqPayload,
}: InquiryRfqPayloadPanelProps) {
  const data = profile ?? emptyInquiryProfile();

  return (
    <div className="inquiry-detail-rfq-stack">
      <div className="inquiry-detail-rfq-panels">
        <article className="info-card inquiry-detail-facts-card">
          <h3 className="inquiry-detail-section-title">联系人</h3>
          <dl className="inquiry-detail-facts">
            <FactRow label="姓名">{displayValue(data.fullName)}</FactRow>
            <FactRow label="邮箱">{displayValue(data.email)}</FactRow>
            <FactRow label="国家"><StoredCountryLabel value={data.country} /></FactRow>
            <FactRow label="电话">{displayValue(data.phone)}</FactRow>
            <FactRow label="联系人职位">{displayValue(data.jobTitle)}</FactRow>
          </dl>
        </article>

        <article className="info-card inquiry-detail-facts-card">
          <h3 className="inquiry-detail-section-title">公司信息</h3>
          <dl className="inquiry-detail-facts">
            <FactRow label="公司名称">{displayValue(data.companyName)}</FactRow>
            <FactRow label="VAT">{displayValue(data.vat)}</FactRow>
            <FactRow label="公司网站">{displayValue(data.companyWebsite)}</FactRow>
            <FactRow label="公司规模">{displayValue(data.companySize)}</FactRow>
            <FactRow label="公司地址">{displayValue(data.companyAddress)}</FactRow>
          </dl>
        </article>

        <article className="info-card inquiry-detail-facts-card">
          <h3 className="inquiry-detail-section-title">项目信息</h3>
          <dl className="inquiry-detail-facts">
            <FactRow label="项目名称">{displayValue(data.projectName)}</FactRow>
            <FactRow label="行业">
              {data.industry.trim()
                ? formatCustomerIndustryLabel(data.industry, 'bilingual')
                : '未填写'}
            </FactRow>
            <FactRow label="项目启动">{displayValue(data.projectStart)}</FactRow>
            <FactRow label="年度指标">{displayValue(data.annualTarget)}</FactRow>
          </dl>
        </article>
      </div>

      {rfqPayload && isContactInquiry(rfqPayload) && rfqPayload.procurementDetails ? (
        <article className="info-card inquiry-detail-facts-card">
          <h3 className="inquiry-detail-section-title">采购需求</h3>
          <pre className="inquiry-detail-fallback-text">{rfqPayload.procurementDetails}</pre>
        </article>
      ) : null}

      {rfqPayload?.projectAttachments.length ? (
        <article className="info-card inquiry-detail-attachments-card">
          <h3 className="inquiry-detail-section-title">项目附件</h3>
          <ul className="inquiry-detail-attachments">
            {rfqPayload.projectAttachments.map((file) => (
              <li key={file.key}>
                <a href={file.url} className="nav-link" target="_blank" rel="noreferrer">
                  {file.filename}
                </a>
              </li>
            ))}
          </ul>
        </article>
      ) : null}
    </div>
  );
}

export type { InquiryQuotedLine };

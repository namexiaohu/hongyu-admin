'use client';

import { AlertOutlined, HistoryOutlined, RightOutlined } from '@ant-design/icons';
import Link from 'next/link';

export type ComplaintView = 'active' | 'history';

type ComplaintViewSwitchProps = {
  current: ComplaintView;
  activeCount?: number;
};

export function ComplaintViewSwitch({ current, activeCount }: ComplaintViewSwitchProps) {
  return (
    <nav className="inquiry-view-switch" aria-label="投诉建议视图切换">
      <Link
        href="/admin/complaints"
        className={`inquiry-view-switch__item${current === 'active' ? ' is-active' : ''}`}
        aria-current={current === 'active' ? 'page' : undefined}
      >
        <AlertOutlined />
        <span>待处理投诉建议</span>
        {typeof activeCount === 'number' && activeCount > 0 ? (
          <span className="inquiry-view-switch__badge">{activeCount}</span>
        ) : null}
      </Link>
      <Link
        href="/admin/complaints/history"
        className={`inquiry-view-switch__item inquiry-view-switch__item--history${current === 'history' ? ' is-active' : ''}`}
        aria-current={current === 'history' ? 'page' : undefined}
      >
        <HistoryOutlined />
        <span>历史投诉建议</span>
        {current === 'active' ? <RightOutlined className="inquiry-view-switch__arrow" /> : null}
      </Link>
    </nav>
  );
}

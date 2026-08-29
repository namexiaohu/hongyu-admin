import { Modal } from 'antd';

import type { AcademyStatus } from '@/lib/academy-content-shared';

export function confirmAcademyListingChange(
  entityLabel: string,
  nextStatus: Extract<AcademyStatus, 'published' | 'draft'>,
  onConfirm: () => void,
) {
  const isListing = nextStatus === 'published';

  Modal.confirm({
    title: isListing ? `确定上架该${entityLabel}吗？` : `确定下架该${entityLabel}吗？`,
    content: isListing
      ? `上架后${entityLabel}将恢复在前台展示。`
      : `下架后前台将不再展示该${entityLabel}。`,
    okText: isListing ? '上架' : '下架',
    cancelText: '取消',
    okButtonProps: isListing ? undefined : { danger: true },
    onOk: onConfirm,
  });
}

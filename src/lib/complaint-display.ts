import type { ComplaintStatus } from '@/lib/complaint-list-query';

export const complaintStatusLabels: Record<ComplaintStatus, string> = {
  new: '新提交',
  contacted: '已回复',
  closed: '已关闭',
};

export const complaintStatusColors: Record<ComplaintStatus, string> = {
  new: 'gold',
  contacted: 'blue',
  closed: 'default',
};

export const complaintStatusOptions = (Object.keys(complaintStatusLabels) as ComplaintStatus[]).map((value) => ({
  value,
  label: complaintStatusLabels[value],
}));

export function complaintDisplayName(fullName: string | null | undefined) {
  const trimmed = fullName?.trim() ?? '';
  return trimmed || '未留姓名';
}

export function complaintDisplayContact(contact: string | null | undefined) {
  const trimmed = contact?.trim() ?? '';
  return trimmed || '未留联系方式';
}

export function complaintExcerpt(message: string, max = 80) {
  const trimmed = message.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

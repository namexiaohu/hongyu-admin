import type { SurgeonGradeKey } from '@/lib/surgeon-content';
import { surgeonGradeKeys } from '@/lib/surgeon-content';

export type SurgeonPickerItem = {
  id: string;
  name: string;
  slug: string;
  avatar: string;
  gradeKey: SurgeonGradeKey;
  position: string;
  institution: string;
};

export type SurgeonPickerListQuery = {
  keyword?: string;
  gradeKey?: SurgeonGradeKey;
  page?: number;
  pageSize?: number;
};

export type SurgeonPickerListResult = {
  items: SurgeonPickerItem[];
  total: number;
  page: number;
  pageSize: number;
};

export const surgeonPickerGradeOptions = surgeonGradeKeys.map((value) => ({
  value,
  label: value === 'platinum' ? '铂金' : value === 'gold' ? '金' : '银',
}));

export function formatSurgeonSelectedDisplay(item: SurgeonPickerItem) {
  const parts = [item.position, item.institution].map((part) => part.trim()).filter(Boolean);
  return {
    name: item.name,
    meta: parts.length ? parts.join(' · ') : (item.slug || null),
  };
}

export function buildSurgeonPickerQueryString(params: SurgeonPickerListQuery) {
  const query = new URLSearchParams();
  if (params.keyword?.trim()) query.set('keyword', params.keyword.trim());
  if (params.gradeKey) query.set('grade_key', params.gradeKey);
  if (params.page && params.page > 1) query.set('page', String(params.page));
  if (params.pageSize && params.pageSize !== 50) query.set('page_size', String(params.pageSize));
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

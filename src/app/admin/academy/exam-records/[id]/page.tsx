import { notFound } from 'next/navigation';

import { ExamRecordDetailClient } from '@/components/academy/exam-record-detail-client';
import { getAdminExamRecordDetail } from '@/server/admin/academy-exam-records';

type PageProps = { params: Promise<{ id: string }> };

export default async function AcademyExamRecordDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await getAdminExamRecordDetail(id);
  if (!detail) notFound();
  return <ExamRecordDetailClient initialDetail={detail} />;
}

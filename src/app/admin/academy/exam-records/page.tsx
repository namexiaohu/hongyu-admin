import { Suspense } from 'react';

import { ExamRecordListClient } from '@/components/academy/exam-record-list-client';
import { getAdminExamRecordList } from '@/server/admin/academy-exam-records';

export default async function AcademyExamRecordsPage() {
  const list = await getAdminExamRecordList();

  return (
    <Suspense fallback={null}>
      <ExamRecordListClient initialList={list} />
    </Suspense>
  );
}

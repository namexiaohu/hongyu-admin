import { Suspense } from 'react';

import { QuestionBankListClient } from '@/components/academy/question-bank-list-client';
import { getActiveAdminSiteLanguages } from '@/server/admin/languages';
import { getAdminAcademyQuestionBankList } from '@/server/admin/academy-question-banks';

export default async function AcademyQuestionBanksPage() {
  const [list, activeLanguages] = await Promise.all([
    getAdminAcademyQuestionBankList(),
    getActiveAdminSiteLanguages(),
  ]);

  return (
    <Suspense fallback={null}>
      <QuestionBankListClient initialList={list} activeLanguages={activeLanguages} />
    </Suspense>
  );
}

import { notFound } from 'next/navigation';

import { QuestionBankEditorClient } from '@/components/academy/question-bank-editor-client';
import { getActiveAdminSiteLanguages } from '@/server/admin/languages';
import { getAdminAcademyQuestionBankDetail } from '@/server/admin/academy-question-banks';

type PageProps = { params: Promise<{ bankId: string }> };

export default async function AcademyQuestionBankEditPage({ params }: PageProps) {
  const { bankId } = await params;
  const [detail, activeLanguages] = await Promise.all([
    getAdminAcademyQuestionBankDetail(bankId),
    getActiveAdminSiteLanguages(),
  ]);

  if (!detail) notFound();

  return (
    <QuestionBankEditorClient
      bankId={bankId}
      initialDetail={detail}
      activeLanguages={activeLanguages}
    />
  );
}

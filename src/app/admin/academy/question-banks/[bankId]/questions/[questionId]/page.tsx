import { notFound } from 'next/navigation';

import { QuestionEditorClient } from '@/components/academy/question-editor-client';
import { getActiveAdminSiteLanguages } from '@/server/admin/languages';
import { getAdminAcademyQuestionDetail } from '@/server/admin/academy-questions';

type PageProps = { params: Promise<{ bankId: string; questionId: string }> };

export default async function AcademyQuestionEditPage({ params }: PageProps) {
  const { bankId, questionId } = await params;
  const [detail, activeLanguages] = await Promise.all([
    getAdminAcademyQuestionDetail(questionId),
    getActiveAdminSiteLanguages(),
  ]);

  if (!detail || detail.questionBankId !== bankId) notFound();

  return (
    <QuestionEditorClient
      bankId={bankId}
      initialDetail={detail}
      activeLanguages={activeLanguages}
    />
  );
}

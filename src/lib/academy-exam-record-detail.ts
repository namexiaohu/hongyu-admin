import type { AcademyQuestionContent, AcademyQuestionType } from '@/lib/academy-question-content';

export type AdminExamRecordDetail = {
  id: string;
  user: { id: string; name: string; email: string };
  courseTitle: string;
  certificateTitle: string;
  examTitle: string;
  score: number;
  totalScore: number;
  scorePercent: number;
  passed: boolean;
  startedAt: string;
  submittedAt: string;
  certificateMailStatus: 'unsent' | 'sent';
  certificateMailFile: string | null;
  certificateMailFileUrl: string | null;
  certificateMailUpdatedAt: string | null;
  certificateNumber: string | null;
  certificateIssuedAt: string | null;
  review: Array<{
    id: string;
    index: number;
    questionType: AcademyQuestionType;
    score: number;
    prompt: string;
    content: AcademyQuestionContent;
    userAnswer: unknown;
    isCorrect: boolean;
  }>;
};

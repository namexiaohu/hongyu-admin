export type AdminExamRecordListItem = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  courseId: string;
  courseTitle: string;
  certificateTitle: string;
  score: number;
  totalScore: number;
  scorePercent: number;
  passed: boolean;
  submittedAt: string;
  certificateMailStatus: 'unsent' | 'sent';
  hasCertificate: boolean;
};

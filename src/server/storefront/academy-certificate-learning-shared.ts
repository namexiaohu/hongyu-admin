import type { CertificateProgressSnapshot } from '@/server/storefront/academy-certificate-progress';

export type CertificateLearningStatus = 'not_started' | 'learning' | 'courses_complete' | 'exam_passed';

export type ActiveCertificateLearningStatus = 'learning' | 'courses_complete';

export function resolveCertificateLearningStatus(
  progressSnapshot: Pick<CertificateProgressSnapshot, 'completedLessonCount' | 'totalLessonCount'> | null,
  earnedPassed: boolean,
): CertificateLearningStatus {
  if (earnedPassed) return 'exam_passed';
  if (
    progressSnapshot
    && progressSnapshot.totalLessonCount > 0
    && progressSnapshot.completedLessonCount === progressSnapshot.totalLessonCount
  ) {
    return 'courses_complete';
  }
  if (progressSnapshot) return 'learning';
  return 'not_started';
}

export function isActiveHomeCertificateStatus(
  status: CertificateLearningStatus,
): status is ActiveCertificateLearningStatus {
  return status === 'learning' || status === 'courses_complete';
}

export function academyCertificateExamPath(certificateSlug: string) {
  return `/certificates/${encodeURIComponent(certificateSlug)}/exam`;
}

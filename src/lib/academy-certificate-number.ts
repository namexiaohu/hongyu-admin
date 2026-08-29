import { randomBytes } from 'node:crypto';

export const ACADEMY_CERTIFICATE_ISSUER = '上海竑宇医疗';

export function generateAcademyCertificateNumber(issuedAt = new Date()) {
  const year = issuedAt.getFullYear();
  const segment = randomBytes(4).toString('hex').toUpperCase();
  return `HY-${year}-${segment}`;
}

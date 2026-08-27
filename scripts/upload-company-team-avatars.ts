/**
 * Upload management-team avatar PNGs to R2 and patch avatarUrl (storage key) on all locales.
 *
 * Usage: pnpm exec tsx scripts/upload-company-team-avatars.ts
 */
import '@/lib/env';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import postgres from 'postgres';

const ASSETS_DIR = path.join(
  process.env.USERPROFILE || process.env.HOME || '',
  '.cursor',
  'projects',
  'f-data-dev-html-lianchuan-hongyu',
  'assets',
);

/** memberId → local PNG filename */
const AVATARS: Array<{ id: string; file: string; key: string }> = [
  { id: '11111111-1111-4111-8111-111111111101', file: 'team-ceo-wei-wang.png', key: 'company/team/wei-wang.png' },
  { id: '11111111-1111-4111-8111-111111111201', file: 'team-mgr-li-chen.png', key: 'company/team/li-chen.png' },
  { id: '11111111-1111-4111-8111-111111111202', file: 'team-mgr-min-zhao.png', key: 'company/team/min-zhao.png' },
  { id: '11111111-1111-4111-8111-111111111203', file: 'team-mgr-hannah-liu.png', key: 'company/team/hannah-liu.png' },
  { id: '11111111-1111-4111-8111-111111111204', file: 'team-mgr-daniel-zhou.png', key: 'company/team/daniel-zhou.png' },
  { id: '11111111-1111-4111-8111-111111111301', file: 'team-staff-hao-sun.png', key: 'company/team/hao-sun.png' },
  { id: '11111111-1111-4111-8111-111111111302', file: 'team-staff-ning-zhou.png', key: 'company/team/ning-zhou.png' },
  { id: '11111111-1111-4111-8111-111111111303', file: 'team-staff-ting-wu.png', key: 'company/team/ting-wu.png' },
  { id: '11111111-1111-4111-8111-111111111304', file: 'team-staff-kai-zheng.png', key: 'company/team/kai-zheng.png' },
  { id: '11111111-1111-4111-8111-111111111305', file: 'team-staff-lei-feng.png', key: 'company/team/lei-feng.png' },
  { id: '11111111-1111-4111-8111-111111111306', file: 'team-staff-ming-chu.png', key: 'company/team/ming-chu.png' },
  { id: '11111111-1111-4111-8111-111111111307', file: 'team-staff-fang-wei.png', key: 'company/team/fang-wei.png' },
  { id: '11111111-1111-4111-8111-111111111308', file: 'team-staff-ou-jiang.png', key: 'company/team/ou-jiang.png' },
  { id: '11111111-1111-4111-8111-111111111309', file: 'team-staff-mei-shen.png', key: 'company/team/mei-shen.png' },
];

function getR2Client() {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const accessKeySecret = process.env.R2_ACCESS_KEY_SECRET;
  const bucket = process.env.R2_BUCKET;
  const endpoint = process.env.R2_ENDPOINT;
  const region = process.env.R2_REGION || 'auto';
  if (!accessKeyId || !accessKeySecret || !bucket || !endpoint) {
    throw new Error('R2 env vars missing (R2_ACCESS_KEY_ID / SECRET / BUCKET / ENDPOINT)');
  }
  const client = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey: accessKeySecret },
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return { client, bucket };
}

async function uploadAll() {
  const { client, bucket } = getR2Client();
  const keyById = new Map<string, string>();

  for (const item of AVATARS) {
    const filePath = path.join(ASSETS_DIR, item.file);
    const buffer = await readFile(filePath);
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: item.key,
      Body: buffer,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000, immutable',
    }));
    keyById.set(item.id, item.key);
    console.log(`[avatars] Uploaded ${item.file} → ${item.key}`);
  }

  return keyById;
}

async function patchDb(keyById: Map<string, string>) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');

  const sql = postgres(connectionString, { prepare: false, max: 1 });
  try {
    const rows = await sql<{ id: string; locale: string; management_team: unknown }[]>`
      SELECT id, locale, management_team FROM company_profiles_i18n ORDER BY locale
    `;

    for (const row of rows) {
      const team = Array.isArray(row.management_team) ? row.management_team as Array<Record<string, unknown>> : [];
      const next = team.map((member) => {
        const id = String(member.id ?? '');
        const key = keyById.get(id);
        if (!key) return member;
        return { ...member, avatarUrl: key };
      });
      await sql`
        UPDATE company_profiles_i18n
        SET management_team = ${sql.json(next)}, updated_at = now()
        WHERE id = ${row.id}
      `;
      const patched = next.filter((m) => keyById.has(String(m.id ?? ''))).length;
      console.log(`[avatars] Patched ${row.locale}: ${patched}/${next.length} avatarUrl keys`);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function main() {
  const keyById = await uploadAll();
  await patchDb(keyById);
  console.log('[avatars] Done.');
}

main().catch((error) => {
  console.error('[avatars] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});

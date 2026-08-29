/**
 * Upload sample lesson material files to R2 and attach 1–2 materials to every academy lesson.
 *
 * Usage: pnpm exec tsx scripts/seed-academy-lesson-materials.ts
 */
import '@/lib/env';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { eq } from 'drizzle-orm';

import { db } from '@/server/db';
import { academyLessons } from '@/server/db/schema';

type MaterialSeed = {
  key: string;
  name: string;
  mimeType: string;
  body: Buffer;
};

function getR2Client() {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const accessKeySecret = process.env.R2_ACCESS_KEY_SECRET;
  const bucket = process.env.R2_BUCKET;
  const endpoint = process.env.R2_ENDPOINT;
  const region = process.env.R2_REGION || 'auto';
  if (!accessKeyId || !accessKeySecret || !bucket || !endpoint) {
    throw new Error('R2 env vars missing');
  }
  return {
    client: new S3Client({
      region,
      endpoint,
      credentials: { accessKeyId, secretAccessKey: accessKeySecret },
      forcePathStyle: true,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    }),
    bucket,
  };
}

/** Minimal valid PDF */
function makePdf(title: string) {
  const content = `BT /F1 18 Tf 72 720 Td (${title.replace(/[()\\]/g, '')}) Tj ET`;
  const objects = [
    '1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n',
    '2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n',
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n',
    `4 0 obj<< /Length ${content.length} >>stream\n${content}\nendstream\nendobj\n`,
    '5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }
  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

function makeCsv(title: string) {
  return Buffer.from(`title,note\n"${title}","Sample clinical dataset for academy lesson materials"\n`, 'utf8');
}

async function main() {
  const { client, bucket } = getR2Client();
  const pool: MaterialSeed[] = [
    {
      key: 'academy/lesson-materials/pool/course-outline.pdf',
      name: 'Course Outline.pdf',
      mimeType: 'application/pdf',
      body: makePdf('Course Outline'),
    },
    {
      key: 'academy/lesson-materials/pool/clinical-reference.pdf',
      name: 'Clinical Reference.pdf',
      mimeType: 'application/pdf',
      body: makePdf('Clinical Reference'),
    },
    {
      key: 'academy/lesson-materials/pool/case-dataset.csv',
      name: 'Case Dataset.csv',
      mimeType: 'text/csv',
      body: makeCsv('Case Dataset'),
    },
    {
      key: 'academy/lesson-materials/pool/lab-guide.pdf',
      name: 'Lab Interpretation Guide.pdf',
      mimeType: 'application/pdf',
      body: makePdf('Lab Interpretation Guide'),
    },
  ];

  for (const item of pool) {
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: item.key,
      Body: item.body,
      ContentType: item.mimeType,
      CacheControl: 'public, max-age=31536000, immutable',
    }));
    console.log(`[materials] Uploaded ${item.key}`);
  }

  const lessons = await db.select({ id: academyLessons.id }).from(academyLessons);
  for (const [index, lesson] of lessons.entries()) {
    const first = pool[index % pool.length]!;
    const second = pool[(index + 1) % pool.length]!;
    const materials = [
      {
        name: first.name,
        url: first.key,
        mimeType: first.mimeType,
        size: first.body.length,
      },
      {
        name: second.name,
        url: second.key,
        mimeType: second.mimeType,
        size: second.body.length,
      },
    ];
    await db
      .update(academyLessons)
      .set({ materials, updatedAt: new Date() })
      .where(eq(academyLessons.id, lesson.id));
  }

  console.log(`[materials] Attached files to ${lessons.length} lessons.`);
}

main().catch((error) => {
  console.error('[materials] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});

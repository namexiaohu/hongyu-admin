/**
 * Download veterinary/education images from Unsplash and upload to R2.
 *
 * Usage: pnpm exec tsx scripts/upload-academy-covers.ts
 */
import '@/lib/env';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

type CoverAsset = {
  key: string;
  unsplashUrl: string;
};

const COVERS: CoverAsset[] = [
  { key: 'academy/certificates/small-animal-clinical.jpg', unsplashUrl: 'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=1200&q=80&auto=format&fit=crop' },
  { key: 'academy/certificates/veterinary-imaging.jpg', unsplashUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80&auto=format&fit=crop' },
  { key: 'academy/certificates/pet-nutrition-health.jpg', unsplashUrl: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=1200&q=80&auto=format&fit=crop' },
  { key: 'academy/certificates/veterinary-surgery.jpg', unsplashUrl: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=1200&q=80&auto=format&fit=crop' },
  { key: 'academy/courses/small-animal-internal-medicine.jpg', unsplashUrl: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1200&q=80&auto=format&fit=crop' },
  { key: 'academy/courses/canine-feline-imaging.jpg', unsplashUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&q=80&auto=format&fit=crop' },
  { key: 'academy/courses/clinical-nutrition-basics.jpg', unsplashUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1200&q=80&auto=format&fit=crop' },
  { key: 'academy/courses/veterinary-anesthesia.jpg', unsplashUrl: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1200&q=80&auto=format&fit=crop' },
  { key: 'academy/courses/soft-tissue-surgery.jpg', unsplashUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200&q=80&auto=format&fit=crop' },
  { key: 'academy/courses/emergency-critical-care.jpg', unsplashUrl: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=1200&q=80&auto=format&fit=crop' },
  { key: 'academy/courses/advanced-diagnostic-imaging.jpg', unsplashUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&q=80&auto=format&fit=crop' },
  { key: 'academy/courses/therapeutic-nutrition.jpg', unsplashUrl: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200&q=80&auto=format&fit=crop' },
  { key: 'academy/courses/minimally-invasive-surgery.jpg', unsplashUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200&q=80&auto=format&fit=crop' },
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

async function main() {
  const { client, bucket } = getR2Client();
  for (const cover of COVERS) {
    const response = await fetch(cover.unsplashUrl);
    if (!response.ok) throw new Error(`Failed to download ${cover.unsplashUrl}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: cover.key,
      Body: buffer,
      ContentType: 'image/jpeg',
      CacheControl: 'public, max-age=31536000, immutable',
    }));
    console.log(`[academy-covers] Uploaded ${cover.key}`);
  }
  console.log('[academy-covers] Done.');
}

main().catch((error) => {
  console.error('[academy-covers] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});

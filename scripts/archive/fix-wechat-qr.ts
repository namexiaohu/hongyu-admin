import '@/lib/env';

import { eq } from 'drizzle-orm';

import { compactSocialChannels } from '@/lib/social-media';
import { getPublicOssDomain, resolveOssAssetUrl } from '@/lib/oss-asset-url';
import { db } from '@/server/db';
import { socialMediaProfiles } from '@/server/db/schema';
import { putStorageObject } from '@/server/oss';

const WECHAT_QR_PAYLOAD = '竑宇医疗 HONGYU';

async function downloadWechatQrBuffer() {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(WECHAT_QR_PAYLOAD)}`;
  const response = await fetch(qrUrl, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; hongyu-wechat-qr-fix/1.0)' },
  });
  if (!response.ok) throw new Error(`Download failed ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 256 || buffer.slice(0, 4).toString('hex') !== '89504e47') {
    throw new Error(`Invalid QR PNG (${buffer.length} bytes)`);
  }
  return buffer;
}

async function main() {
  const key = 'social-media/qr/wechat.png';
  console.log('生成并上传微信二维码到 R2…');
  const buffer = await downloadWechatQrBuffer();
  const result = await putStorageObject(key, buffer, 'image/png');
  if (!result.ok) throw new Error(result.error);

  const [row] = await db.select().from(socialMediaProfiles).limit(1);
  if (!row) throw new Error('无社交媒体数据');

  const socialChannels = compactSocialChannels(row.socialChannels).map((channel) => (
    channel.type === 'wechat' ? { ...channel, qrCode: result.key } : channel
  ));

  await db.update(socialMediaProfiles).set({
    socialChannels,
    updatedAt: new Date(),
  }).where(eq(socialMediaProfiles.id, row.id));

  const url = resolveOssAssetUrl(result.key);
  console.log('R2 key:', result.key);
  console.log('URL:', url);

  const verify = await fetch(url, { method: 'GET' });
  const verifyBuffer = Buffer.from(await verify.arrayBuffer());
  console.log('Verify:', verify.status, verifyBuffer.length, 'bytes', verifyBuffer.slice(0, 4).toString('hex'));
  console.log('R2 domain:', getPublicOssDomain());
  console.log('微信二维码已修复。');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import '@/lib/env';

import { and, eq } from 'drizzle-orm';

import { db } from '@/server/db';
import { socialMediaProfileTranslations, socialMediaProfiles } from '@/server/db/schema';
import { putStorageObject } from '@/server/oss';

const WECHAT_QR_PAYLOAD = '竑宇医疗 HONGYU';

const FEATURED_IMAGES = [
  {
    slug: 'eurotier-2025',
    url: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80',
  },
  {
    slug: 'v-clamp-demo',
    url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80',
  },
  {
    slug: 'cfvc-2025',
    url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
  },
] as const;

async function downloadBuffer(url: string) {
  const response = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; hongyu-social-seed/1.0)' } });
  if (!response.ok) throw new Error(`Download failed ${response.status}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

function assertValidImageBuffer(buffer: Buffer, label: string) {
  if (buffer.length < 256) {
    throw new Error(`${label} 无效：文件过小 (${buffer.length} bytes)`);
  }
  const magic = buffer.slice(0, 4).toString('hex');
  const valid = magic.startsWith('ffd8') || magic.startsWith('89504e47') || magic.startsWith('474946');
  if (!valid) {
    throw new Error(`${label} 无效：不是 JPG/PNG/GIF (magic: ${magic})`);
  }
}

async function uploadFeaturedImage(slug: string, url: string) {
  const key = `social-media/featured/${slug}.jpg`;
  console.log(`  上传精选封面: ${slug} → ${key}`);
  const buffer = await downloadBuffer(url);
  assertValidImageBuffer(buffer, slug);
  const result = await putStorageObject(key, buffer, 'image/jpeg');
  if (!result.ok) throw new Error(result.error);
  return result.key;
}

async function uploadWechatQr() {
  const key = 'social-media/qr/wechat.png';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(WECHAT_QR_PAYLOAD)}`;
  console.log(`  上传微信二维码 → ${key}`);
  const buffer = await downloadBuffer(qrUrl);
  assertValidImageBuffer(buffer, '微信二维码');
  const result = await putStorageObject(key, buffer, 'image/png');
  if (!result.ok) throw new Error(result.error);
  return result.key;
}

async function main() {
  console.log('上传社交媒体资源到 R2…');
  const featuredCovers = Object.fromEntries(
    await Promise.all(FEATURED_IMAGES.map(async (item) => [item.slug, await uploadFeaturedImage(item.slug, item.url)])),
  ) as Record<(typeof FEATURED_IMAGES)[number]['slug'], string>;

  const wechatQr = await uploadWechatQr();

  const socialChannels = [
    { type: 'linkedin' as const, name: '@hongyu-medical', url: 'https://www.linkedin.com/company/hongyu-medical', qrCode: '' },
    { type: 'youtube' as const, name: '@HONGYUMedical', url: 'https://www.youtube.com/@hongyumedical', qrCode: '' },
    { type: 'facebook' as const, name: '/HONGYUMedical', url: 'https://www.facebook.com/hongyumedical', qrCode: '' },
    { type: 'instagram' as const, name: '@hongyu_medical', url: 'https://www.instagram.com/hongyumedical', qrCode: '' },
    { type: 'x' as const, name: '@HONGYUMedical', url: 'https://twitter.com/hongyumedical', qrCode: '' },
    { type: 'whatsapp' as const, name: 'HONGYU Medical', url: 'https://wa.me/8613588888888', qrCode: '' },
    { type: 'wechat' as const, name: '竑宇医疗 HONGYU', url: '', qrCode: wechatQr },
  ];

  const overseasContacts = [
    {
      region: 'europe' as const,
      location: 'Europe · Munich Office',
      phone: '+49 89 2103 8600',
      contactPerson: 'Daniel Zhou',
      email: 'europe@hongyuvet.com',
      address: 'Maximilianstrasse 35, 80539 Munich, Germany',
    },
    {
      region: 'north-america' as const,
      location: 'North America · New York Office',
      phone: '+1 212 555 0198',
      contactPerson: 'Sarah Miller',
      email: 'na@hongyuvet.com',
      address: 'New York, USA',
    },
    {
      region: 'asia-pacific' as const,
      location: 'Asia Pacific · Tokyo Office',
      phone: '+81 3 5555 0198',
      contactPerson: 'Ken Tanaka',
      email: 'apac@hongyuvet.com',
      address: 'Tokyo, Japan',
    },
    {
      region: 'oceania' as const,
      location: 'Global Partnership',
      phone: '',
      contactPerson: 'Partnerships Team',
      email: 'partnerships@hongyuvet.com',
      address: 'Response within 3 business days · English / 中文 / Deutsch / 日本語',
    },
  ];

  const now = new Date();
  const [existing] = await db.select({ id: socialMediaProfiles.id }).from(socialMediaProfiles).limit(1);

  let profileId = existing?.id;
  const shared = {
    socialChannels,
    overseasContacts,
    updatedAt: now,
  };

  if (profileId) {
    await db.update(socialMediaProfiles).set(shared).where(eq(socialMediaProfiles.id, profileId));
  } else {
    const [inserted] = await db.insert(socialMediaProfiles).values(shared).returning({ id: socialMediaProfiles.id });
    profileId = inserted.id;
  }

  if (!profileId) throw new Error('Failed to upsert social media profile');

  const translations = [
    {
      locale: 'en',
      featuredPosts: [
        {
          coverImage: featuredCovers['eurotier-2025'],
          badgeText: 'LinkedIn',
          title: 'HONGYU Medical at EuroTier 2025 — next-generation V-CLAMP showcase',
          description: 'Nov 2025',
          url: '',
        },
        {
          coverImage: featuredCovers['v-clamp-demo'],
          badgeText: 'YouTube',
          title: 'V-CLAMP training video — standard closure workflow',
          description: 'Oct 2025',
          url: '',
        },
        {
          coverImage: featuredCovers['cfvc-2025'],
          badgeText: 'Instagram',
          title: 'CFVC 2025 highlights from surgeons worldwide',
          description: 'Aug 2025',
          url: '',
        },
      ],
    },
    {
      locale: 'zh',
      featuredPosts: [
        {
          coverImage: featuredCovers['eurotier-2025'],
          badgeText: 'LinkedIn',
          title: '竑宇医疗亮相 EuroTier 2025，展示新一代 V-CLAMP 产品',
          description: '2025.11',
          url: '',
        },
        {
          coverImage: featuredCovers['v-clamp-demo'],
          badgeText: 'YouTube',
          title: 'V-CLAMP 操作教学视频 — 标准闭合流程演示',
          description: '2025.10',
          url: '',
        },
        {
          coverImage: featuredCovers['cfvc-2025'],
          badgeText: 'Instagram',
          title: 'CFVC 2025 回顾 — 来自全球术者的精彩瞬间',
          description: '2025.08',
          url: '',
        },
      ],
    },
  ];

  for (const translation of translations) {
    const payload = {
      featuredPosts: translation.featuredPosts,
      updatedAt: now,
    };

    const [byLocale] = await db
      .select({ id: socialMediaProfileTranslations.id })
      .from(socialMediaProfileTranslations)
      .where(and(
        eq(socialMediaProfileTranslations.profileId, profileId),
        eq(socialMediaProfileTranslations.locale, translation.locale),
      ))
      .limit(1);

    if (byLocale) {
      await db.update(socialMediaProfileTranslations).set(payload).where(eq(socialMediaProfileTranslations.id, byLocale.id));
    } else {
      await db.insert(socialMediaProfileTranslations).values({
        profileId,
        locale: translation.locale,
        ...payload,
      });
    }
  }

  console.log('Social media profile seeded (en + zh, R2 assets).');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

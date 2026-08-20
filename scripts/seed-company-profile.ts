import '@/lib/env';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { and, eq } from 'drizzle-orm';

import { db } from '@/server/db';
import { companyProfileTranslations, companyProfiles } from '@/server/db/schema';
import { putStorageObject } from '@/server/oss';

const WEB_PUBLIC = path.resolve(process.cwd(), '../hongyu-web/public');

const OFFICE_IMAGES = [
  {
    slug: 'shanghai',
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
  },
  {
    slug: 'beijing',
    url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    slug: 'munich',
    url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
  },
] as const;

const PUBLIC_FILE_SPECS = [
  { name: 'Business License', filename: 'hongyu-business-license.pdf' },
  { name: 'ISO 13485 Certificate', filename: 'hongyu-iso-13485.pdf' },
  { name: 'CE Certificate', filename: 'hongyu-ce-certificate.pdf' },
  { name: 'Annual Report 2025', filename: 'hongyu-annual-report-2025.pdf' },
] as const;

async function downloadBuffer(url: string) {
  const response = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; hongyu-company-seed/1.0)' } });
  if (!response.ok) throw new Error(`Download failed ${response.status}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function uploadOfficeCover(slug: string, url: string) {
  const key = `company/offices/${slug}.jpg`;
  console.log(`  上传办公封面: ${slug} → ${key}`);
  const buffer = await downloadBuffer(url);
  const result = await putStorageObject(key, buffer, 'image/jpeg');
  if (!result.ok) throw new Error(result.error);
  return result.key;
}

async function uploadPublicFile(filename: string) {
  const key = `company/files/${filename}`;
  console.log(`  上传公开文件: ${filename} → ${key}`);
  const buffer = await readFile(path.join(WEB_PUBLIC, 'files', filename));
  const result = await putStorageObject(key, buffer, 'application/pdf');
  if (!result.ok) throw new Error(result.error);
  return result.key;
}

async function main() {
  console.log('上传企业信息资源到 R2…');
  const officeCovers = Object.fromEntries(
    await Promise.all(OFFICE_IMAGES.map(async (item) => [item.slug, await uploadOfficeCover(item.slug, item.url)])),
  ) as Record<(typeof OFFICE_IMAGES)[number]['slug'], string>;

  const publicFiles = await Promise.all(PUBLIC_FILE_SPECS.map(async (file) => ({
    name: file.name,
    url: await uploadPublicFile(file.filename),
  })));

  const now = new Date();
  const [existing] = await db.select({ id: companyProfiles.id }).from(companyProfiles).limit(1);

  let profileId = existing?.id;
  const shared = {
    companyEmail: 'info@hongyuvet.com',
    businessEmail: 'business@hongyuvet.com',
    website: 'https://www.hongyuvet.com/',
    icpNumber: '',
    publicFiles,
    updatedAt: now,
  };

  if (profileId) {
    await db.update(companyProfiles).set(shared).where(eq(companyProfiles.id, profileId));
  } else {
    const [inserted] = await db.insert(companyProfiles).values(shared).returning({ id: companyProfiles.id });
    profileId = inserted.id;
  }

  if (!profileId) throw new Error('Failed to upsert company profile');

  const translations = [
    {
      locale: 'en',
      companyName: 'Shanghai HONGYU Medical',
      slogan: 'For animals. For life',
      positioning: 'An innovative enterprise providing animal health solutions for veterinarians worldwide',
      copyright: '© 2026 HONGYU Medical. All rights reserved.',
      contactPhone: '+86 21 5896 2800 (weekdays 9:00–18:00)',
      address: 'Building 8, Zhangjiang Hi-Tech Park, Pudong New Area, Shanghai, China',
      businessHours: 'Monday–Friday 9:00–18:00 (CST)',
      businessHotline: '+86 400 820 6896',
      basicInfo: [
        { label: 'Company name', value: 'Shanghai HONGYU Medical Device Co., Ltd.' },
        { label: 'English name', value: 'Shanghai HONGYU Medical' },
        { label: 'Unified social credit code', value: '91310000MA1FL928XH' },
        { label: 'Legal representative', value: 'Wei Wang' },
        { label: 'Registered capital', value: 'RMB 50,000,000' },
        { label: 'Date of establishment', value: '12 March 2016' },
        { label: 'Business term', value: '12 March 2016 – long term' },
        { label: 'Company type', value: 'Limited liability company (wholly owned)' },
        { label: 'Registered address', value: 'Building 8, Zhangjiang Hi-Tech Park, Pudong New Area, Shanghai, China' },
        { label: 'Business scope', value: 'R&D, manufacture and sale of veterinary medical devices; technical consulting and after-sales service related to animal health.' },
      ],
      executives: [{ title: 'Chief Executive Officer', name: 'Wei Wang' }],
      managers: [
        { title: 'Head of R&D', name: 'Li Chen' },
        { title: 'Head of Quality & Manufacturing', name: 'Min Zhao' },
        { title: 'Head of Marketing', name: 'Hannah Liu' },
        { title: 'Head of International Business', name: 'Daniel Zhou' },
      ],
      offices: [
        {
          coverImage: officeCovers.shanghai,
          name: 'Shanghai Headquarters',
          location: 'Building 8, Zhangjiang Hi-Tech Park, Pudong, Shanghai',
          phone: '+86 21 5896 2800',
          contactPerson: 'Wei Wang',
          email: 'shanghai@hongyuvet.com',
        },
        {
          coverImage: officeCovers.beijing,
          name: 'Beijing Office',
          location: 'Chaoyang District, Beijing, China',
          phone: '+86 10 6581 2098',
          contactPerson: 'Min Zhao',
          email: 'beijing@hongyuvet.com',
        },
        {
          coverImage: officeCovers.munich,
          name: 'Munich Office',
          location: 'Maximilianstrasse 35, 80539 Munich, Germany',
          phone: '+49 89 2103 8600',
          contactPerson: 'Daniel Zhou',
          email: 'europe@hongyuvet.com',
        },
      ],
    },
    {
      locale: 'zh',
      companyName: '上海竑宇医疗',
      slogan: 'For animals. For life',
      positioning: '创新型企业，为全球兽医提供动物健康解决方案',
      copyright: '© 2026 竑宇医疗 All rights reserved.',
      contactPhone: '+86 21 5896 2800（工作日 9:00–18:00）',
      address: '上海市浦东新区张江高科技园区8号楼',
      businessHours: '周一至周五 9:00–18:00（北京时间）',
      businessHotline: '+86 400 820 6896',
      basicInfo: [
        { label: '企业名称', value: '上海竑宇医疗器械有限公司' },
        { label: '英文名称', value: 'Shanghai HONGYU Medical' },
        { label: '统一社会信用代码', value: '91310000MA1FL928XH' },
        { label: '法定代表人', value: '王伟' },
        { label: '注册资本', value: '人民币 5,000 万元' },
        { label: '成立日期', value: '2016年3月12日' },
        { label: '营业期限', value: '2016年3月12日 至 长期' },
        { label: '企业类型', value: '有限责任公司（自然人独资）' },
        { label: '注册地址', value: '上海市浦东新区张江高科技园区8号楼' },
        { label: '经营范围', value: '兽用医疗器械的研发、生产与销售；动物健康相关技术咨询与售后服务。' },
      ],
      executives: [{ title: '首席执行官', name: '王伟' }],
      managers: [
        { title: '研发负责人', name: '陈立' },
        { title: '生产质量负责人', name: '赵敏' },
        { title: '市场负责人', name: '刘涵' },
        { title: '国际业务负责人', name: '周丹' },
      ],
      offices: [
        {
          coverImage: officeCovers.shanghai,
          name: '上海总部',
          location: '上海市浦东新区张江高科技园区8号楼',
          phone: '+86 21 5896 2800',
          contactPerson: '王伟',
          email: 'shanghai@hongyuvet.com',
        },
        {
          coverImage: officeCovers.beijing,
          name: '北京办事处',
          location: '北京市朝阳区',
          phone: '+86 10 6581 2098',
          contactPerson: '赵敏',
          email: 'beijing@hongyuvet.com',
        },
        {
          coverImage: officeCovers.munich,
          name: '慕尼黑办事处',
          location: 'Maximilianstrasse 35, 80539 Munich, Germany',
          phone: '+49 89 2103 8600',
          contactPerson: '周丹',
          email: 'europe@hongyuvet.com',
        },
      ],
    },
  ];

  for (const translation of translations) {
    const payload = {
      companyName: translation.companyName,
      slogan: translation.slogan,
      positioning: translation.positioning,
      copyright: translation.copyright,
      contactPhone: translation.contactPhone,
      address: translation.address,
      businessHours: translation.businessHours,
      businessHotline: translation.businessHotline,
      basicInfo: translation.basicInfo,
      executives: translation.executives,
      managers: translation.managers,
      offices: translation.offices,
      updatedAt: now,
    };

    const [byLocale] = await db
      .select({ id: companyProfileTranslations.id })
      .from(companyProfileTranslations)
      .where(and(
        eq(companyProfileTranslations.profileId, profileId),
        eq(companyProfileTranslations.locale, translation.locale),
      ))
      .limit(1);

    if (byLocale) {
      await db.update(companyProfileTranslations).set(payload).where(eq(companyProfileTranslations.id, byLocale.id));
    } else {
      await db.insert(companyProfileTranslations).values({
        profileId,
        locale: translation.locale,
        ...payload,
      });
    }
  }

  console.log('Company profile seeded (en + zh, R2 assets).');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

/**
 * Seed full management team (executive / manager / staff) for zh-CN, en, es.
 * Preserves current executive + managers identity; adds staff under each manager.
 *
 * Usage: pnpm exec tsx scripts/seed-company-management-team.ts
 */
import '@/lib/env';

import postgres from 'postgres';

type LocaleCopy = {
  name: string;
  title: string;
  email: string;
  contact: string;
  region: string;
};

type MemberSeed = {
  id: string;
  level: 'executive' | 'manager' | 'staff';
  sortOrder: number;
  supervisorId: string;
  avatarUrl: string;
  zh: LocaleCopy;
  en: LocaleCopy;
  es: LocaleCopy;
};

const CEO_ID = '11111111-1111-4111-8111-111111111101';
const MGR_RD = '11111111-1111-4111-8111-111111111201';
const MGR_QA = '11111111-1111-4111-8111-111111111202';
const MGR_MK = '11111111-1111-4111-8111-111111111203';
const MGR_IB = '11111111-1111-4111-8111-111111111204';

const TEAM: MemberSeed[] = [
  {
    id: CEO_ID,
    level: 'executive',
    sortOrder: 0,
    supervisorId: '',
    avatarUrl: 'company/team/wei-wang.png',
    zh: { name: '王伟', title: '首席执行官', email: 'wei.wang@hongyuvet.com', contact: '+86 21 5888 0001', region: '全球' },
    en: { name: 'Wei Wang', title: 'Chief Executive Officer', email: 'wei.wang@hongyuvet.com', contact: '+86 21 5888 0001', region: 'Global' },
    es: { name: 'Wei Wang', title: 'Director ejecutivo', email: 'wei.wang@hongyuvet.com', contact: '+86 21 5888 0001', region: 'Global' },
  },
  {
    id: MGR_RD,
    level: 'manager',
    sortOrder: 1,
    supervisorId: CEO_ID,
    avatarUrl: 'company/team/li-chen.png',
    zh: { name: '李晨', title: '研发负责人', email: 'li.chen@hongyuvet.com', contact: '+86 21 5888 0101', region: '研发中心' },
    en: { name: 'Li Chen', title: 'Head of R&D', email: 'li.chen@hongyuvet.com', contact: '+86 21 5888 0101', region: 'R&D Center' },
    es: { name: 'Li Chen', title: 'Director de I+D', email: 'li.chen@hongyuvet.com', contact: '+86 21 5888 0101', region: 'Centro de I+D' },
  },
  {
    id: MGR_QA,
    level: 'manager',
    sortOrder: 2,
    supervisorId: CEO_ID,
    avatarUrl: 'company/team/min-zhao.png',
    zh: { name: '赵敏', title: '质量与制造负责人', email: 'min.zhao@hongyuvet.com', contact: '+86 21 5888 0102', region: '生产质量' },
    en: { name: 'Min Zhao', title: 'Head of Quality & Manufacturing', email: 'min.zhao@hongyuvet.com', contact: '+86 21 5888 0102', region: 'Quality & Manufacturing' },
    es: { name: 'Min Zhao', title: 'Director de Calidad y Fabricación', email: 'min.zhao@hongyuvet.com', contact: '+86 21 5888 0102', region: 'Calidad y Fabricación' },
  },
  {
    id: MGR_MK,
    level: 'manager',
    sortOrder: 3,
    supervisorId: CEO_ID,
    avatarUrl: 'company/team/hannah-liu.png',
    zh: { name: '刘汉娜', title: '市场负责人', email: 'hannah.liu@hongyuvet.com', contact: '+86 21 5888 0103', region: '市场营销' },
    en: { name: 'Hannah Liu', title: 'Head of Marketing', email: 'hannah.liu@hongyuvet.com', contact: '+86 21 5888 0103', region: 'Marketing' },
    es: { name: 'Hannah Liu', title: 'Director de Marketing', email: 'hannah.liu@hongyuvet.com', contact: '+86 21 5888 0103', region: 'Marketing' },
  },
  {
    id: MGR_IB,
    level: 'manager',
    sortOrder: 4,
    supervisorId: CEO_ID,
    avatarUrl: 'company/team/daniel-zhou.png',
    zh: { name: '周丹尼尔', title: '国际业务负责人', email: 'daniel.zhou@hongyuvet.com', contact: '+86 21 5888 0104', region: '国际业务' },
    en: { name: 'Daniel Zhou', title: 'Head of International Business', email: 'daniel.zhou@hongyuvet.com', contact: '+86 21 5888 0104', region: 'International Business' },
    es: { name: 'Daniel Zhou', title: 'Director de Negocio Internacional', email: 'daniel.zhou@hongyuvet.com', contact: '+86 21 5888 0104', region: 'Negocio Internacional' },
  },
  // R&D staff
  {
    id: '11111111-1111-4111-8111-111111111301',
    level: 'staff',
    sortOrder: 5,
    supervisorId: MGR_RD,
    avatarUrl: 'company/team/hao-sun.png',
    zh: { name: '孙浩', title: '硬件组负责人', email: 'hao.sun@hongyuvet.com', contact: '+86 21 5888 0201', region: '硬件组' },
    en: { name: 'Hao Sun', title: 'Hardware Lead', email: 'hao.sun@hongyuvet.com', contact: '+86 21 5888 0201', region: 'Hardware' },
    es: { name: 'Hao Sun', title: 'Responsable de hardware', email: 'hao.sun@hongyuvet.com', contact: '+86 21 5888 0201', region: 'Hardware' },
  },
  {
    id: '11111111-1111-4111-8111-111111111302',
    level: 'staff',
    sortOrder: 6,
    supervisorId: MGR_RD,
    avatarUrl: 'company/team/ning-zhou.png',
    zh: { name: '周宁', title: '软件组负责人', email: 'ning.zhou@hongyuvet.com', contact: '+86 21 5888 0202', region: '软件组' },
    en: { name: 'Ning Zhou', title: 'Software Lead', email: 'ning.zhou@hongyuvet.com', contact: '+86 21 5888 0202', region: 'Software' },
    es: { name: 'Ning Zhou', title: 'Responsable de software', email: 'ning.zhou@hongyuvet.com', contact: '+86 21 5888 0202', region: 'Software' },
  },
  {
    id: '11111111-1111-4111-8111-111111111303',
    level: 'staff',
    sortOrder: 7,
    supervisorId: MGR_RD,
    avatarUrl: 'company/team/ting-wu.png',
    zh: { name: '吴婷', title: '测试组负责人', email: 'ting.wu@hongyuvet.com', contact: '+86 21 5888 0203', region: '测试组' },
    en: { name: 'Ting Wu', title: 'QA Lead', email: 'ting.wu@hongyuvet.com', contact: '+86 21 5888 0203', region: 'Testing' },
    es: { name: 'Ting Wu', title: 'Responsable de pruebas', email: 'ting.wu@hongyuvet.com', contact: '+86 21 5888 0203', region: 'Pruebas' },
  },
  // QA / Manufacturing staff
  {
    id: '11111111-1111-4111-8111-111111111304',
    level: 'staff',
    sortOrder: 8,
    supervisorId: MGR_QA,
    avatarUrl: 'company/team/kai-zheng.png',
    zh: { name: '郑凯', title: '生产主管', email: 'kai.zheng@hongyuvet.com', contact: '+86 21 5888 0301', region: '生产' },
    en: { name: 'Kai Zheng', title: 'Production Supervisor', email: 'kai.zheng@hongyuvet.com', contact: '+86 21 5888 0301', region: 'Production' },
    es: { name: 'Kai Zheng', title: 'Supervisor de producción', email: 'kai.zheng@hongyuvet.com', contact: '+86 21 5888 0301', region: 'Producción' },
  },
  {
    id: '11111111-1111-4111-8111-111111111305',
    level: 'staff',
    sortOrder: 9,
    supervisorId: MGR_QA,
    avatarUrl: 'company/team/lei-feng.png',
    zh: { name: '冯蕾', title: '质量主管', email: 'lei.feng@hongyuvet.com', contact: '+86 21 5888 0302', region: '质量' },
    en: { name: 'Lei Feng', title: 'Quality Supervisor', email: 'lei.feng@hongyuvet.com', contact: '+86 21 5888 0302', region: 'Quality' },
    es: { name: 'Lei Feng', title: 'Supervisor de calidad', email: 'lei.feng@hongyuvet.com', contact: '+86 21 5888 0302', region: 'Calidad' },
  },
  // Marketing staff
  {
    id: '11111111-1111-4111-8111-111111111306',
    level: 'staff',
    sortOrder: 10,
    supervisorId: MGR_MK,
    avatarUrl: 'company/team/ming-chu.png',
    zh: { name: '褚明', title: '国内市场', email: 'ming.chu@hongyuvet.com', contact: '+86 21 5888 0401', region: '国内市场' },
    en: { name: 'Ming Chu', title: 'Domestic Markets', email: 'ming.chu@hongyuvet.com', contact: '+86 21 5888 0401', region: 'China Market' },
    es: { name: 'Ming Chu', title: 'Mercado nacional', email: 'ming.chu@hongyuvet.com', contact: '+86 21 5888 0401', region: 'Mercado nacional' },
  },
  {
    id: '11111111-1111-4111-8111-111111111307',
    level: 'staff',
    sortOrder: 11,
    supervisorId: MGR_MK,
    avatarUrl: 'company/team/fang-wei.png',
    zh: { name: '卫芳', title: '品牌推广', email: 'fang.wei@hongyuvet.com', contact: '+86 21 5888 0402', region: '品牌推广' },
    en: { name: 'Fang Wei', title: 'Brand Promotion', email: 'fang.wei@hongyuvet.com', contact: '+86 21 5888 0402', region: 'Brand' },
    es: { name: 'Fang Wei', title: 'Promoción de marca', email: 'fang.wei@hongyuvet.com', contact: '+86 21 5888 0402', region: 'Marca' },
  },
  // International staff
  {
    id: '11111111-1111-4111-8111-111111111308',
    level: 'staff',
    sortOrder: 12,
    supervisorId: MGR_IB,
    avatarUrl: 'company/team/ou-jiang.png',
    zh: { name: '蒋欧', title: '欧洲区', email: 'ou.jiang@hongyuvet.com', contact: '+49 30 5888 0501', region: '欧洲区' },
    en: { name: 'Ou Jiang', title: 'Europe Region', email: 'ou.jiang@hongyuvet.com', contact: '+49 30 5888 0501', region: 'Europe' },
    es: { name: 'Ou Jiang', title: 'Región Europa', email: 'ou.jiang@hongyuvet.com', contact: '+49 30 5888 0501', region: 'Europa' },
  },
  {
    id: '11111111-1111-4111-8111-111111111309',
    level: 'staff',
    sortOrder: 13,
    supervisorId: MGR_IB,
    avatarUrl: 'company/team/mei-shen.png',
    zh: { name: '沈美', title: '北美区', email: 'mei.shen@hongyuvet.com', contact: '+1 650 588 0502', region: '北美区' },
    en: { name: 'Mei Shen', title: 'North America Region', email: 'mei.shen@hongyuvet.com', contact: '+1 650 588 0502', region: 'North America' },
    es: { name: 'Mei Shen', title: 'Región Norteamérica', email: 'mei.shen@hongyuvet.com', contact: '+1 650 588 0502', region: 'Norteamérica' },
  },
];

function toLocaleTeam(locale: 'zh' | 'en' | 'es') {
  return TEAM.map((member) => {
    const copy = member[locale];
    return {
      id: member.id,
      level: member.level,
      sortOrder: member.sortOrder,
      avatarUrl: member.avatarUrl,
      supervisorId: member.supervisorId,
      name: copy.name,
      title: copy.title,
      email: copy.email,
      contact: copy.contact,
      region: copy.region,
    };
  });
}

function localeKey(code: string): 'zh' | 'en' | 'es' {
  const normalized = code.trim().toLowerCase();
  if (normalized.startsWith('zh')) return 'zh';
  if (normalized.startsWith('es')) return 'es';
  return 'en';
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');

  const sql = postgres(connectionString, { prepare: false, max: 1 });
  try {
    const rows = await sql<{ id: string; locale: string }[]>`
      SELECT id, locale FROM company_profiles_i18n ORDER BY locale
    `;
    if (!rows.length) {
      console.log('[seed-team] No company_profiles_i18n rows found.');
      return;
    }

    for (const row of rows) {
      const team = toLocaleTeam(localeKey(row.locale));
      await sql`
        UPDATE company_profiles_i18n
        SET management_team = ${sql.json(team)}, updated_at = now()
        WHERE id = ${row.id}
      `;
      console.log(`[seed-team] Updated ${row.locale} with ${team.length} members`);
    }
    console.log('[seed-team] Done.');
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error('[seed-team] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});

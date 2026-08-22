import type { SpeakerItem, SponsorItem, SummitStat } from '@/lib/summit-content';

/** Per-summit hero / media settings applied during seed */
export type SummitSeedMediaProfile = {
  coverMode: 'preset' | 'upload';
  coverPresetId?: string;
  backgroundMode: 'solid' | 'preset' | 'upload' | '';
  backgroundValue: string;
  showCoverOnBackground: boolean;
  /** Local MP4 under scripts/seed-assets/ (uploaded to OSS during seed) */
  videoLocalAsset?: string;
  /** Direct MP4 URL for hero background video (uploaded to OSS during seed) */
  videoDownloadUrl?: string;
  /** Pexels video ID — used when PEXELS_API_KEY is set */
  videoPexelsId?: string;
};

export type SummitSeedSpeakerSeed = SpeakerItem & { avatarUrl: string };

export type SummitSeedSponsorSeed = Omit<SponsorItem, 'logo'> & { logoUrl?: string; logoLocalAsset?: string };

export type SummitSeedLocaleProfile = {
  stats: SummitStat[];
  speakers: SummitSeedSpeakerSeed[];
  sponsors: SummitSeedSponsorSeed[];
};

export type SummitSeedProfile = SummitSeedMediaProfile & {
  i18n: Record<string, SummitSeedLocaleProfile>;
};

const SPEAKER_AVATARS = {
  zhang: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&h=400&q=80',
  tanaka: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&h=400&q=80',
  weber: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=400&h=400&q=80',
  li: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&h=400&q=80',
  wang: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&h=400&q=80',
  mitchell: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=400&h=400&q=80',
  chen: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&h=400&q=80',
  liu: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&h=400&q=80',
  nakamura: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&h=400&q=80',
  hoffmann: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&h=400&q=80',
  dupont: 'https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=400&h=400&q=80',
} as const;

const SPONSOR_LOGOS = {
  chinapet: { logoLocalAsset: 'sponsors/chinapet.png' },
  mindray: { logoLocalAsset: 'sponsors/mindray.png' },
  ringpu: { logoLocalAsset: 'sponsors/ringpu.png' },
  idexx: { logoLocalAsset: 'sponsors/idexx.png' },
  vetoquinol: { logoLocalAsset: 'sponsors/vetoquinol.png' },
  boehringer: { logoLocalAsset: 'sponsors/boehringer.png' },
  zoetis: { logoLocalAsset: 'sponsors/zoetis.png' },
  rppet: { logoLocalAsset: 'sponsors/rppet.png' },
  hongyu: { logoLocalAsset: 'sponsors/hongyu.png' },
} as const;

const CFVC_STATS_ZH: SummitStat[] = [
  { value: '50+', label: '演讲嘉宾' },
  { value: '2,000+', label: '预计参会' },
  { value: '30+', label: '主题演讲' },
  { value: '12', label: '实操工作坊' },
];

const CFVC_STATS_EN: SummitStat[] = [
  { value: '50+', label: 'Speakers' },
  { value: '2,000+', label: 'Expected Attendees' },
  { value: '30+', label: 'Keynote Sessions' },
  { value: '12', label: 'Hands-On Workshops' },
];

const CFVC_SPEAKERS_ZH: SummitSeedSpeakerSeed[] = [
  {
    id: 'cfvc-sp-1',
    name: '张明远',
    avatar: '',
    avatarUrl: SPEAKER_AVATARS.zhang,
    bio: '主任医师 · 北京伴侣动物中心医院',
    expertise: 'V-CLAMP 临床',
    region: '中国 · 北京',
    badgeText: '特邀专家',
    description: '<p>张明远主任医师在北京伴侣动物中心医院从事小动物外科临床工作超过 <strong>15 年</strong>，累计完成 V-CLAMP 血管闭合手术 <strong>800+ 例</strong>。</p><p>他是竑宇医疗 V-CLAMP 产品的核心临床验证专家，参与制定了多项产品临床应用规范，主要贡献包括：</p><ul><li>主导 V-CLAMP 100/200 型号的国内多中心临床试验</li><li>编写《V-CLAMP 血管闭合系统操作规范》第一版</li><li>培训认证术者 30+ 人，覆盖全国 15 个城市</li></ul><p>张医生在<em>小动物软组织外科</em>和<em>血管管理</em>领域享有较高学术声誉，多次在全国兽医外科学术大会上作专题报告。</p>',
  },
  {
    id: 'cfvc-sp-2',
    name: '田中健太',
    avatar: '',
    avatarUrl: SPEAKER_AVATARS.tanaka,
    bio: '兽医学博士 · 东京小动物医疗中心',
    expertise: '运动医学',
    region: '日本 · 东京',
    badgeText: '国际嘉宾',
    description: '<p>田中健太博士毕业于东京大学兽医学部，现任东京小动物医疗中心运动医学学科带头人。他在犬猫关节镜辅助修复技术领域拥有丰富经验，累计完成相关手术 <strong>200+ 例</strong>，并多次在国际兽医外科学术会议上发表研究成果。</p>',
  },
  {
    id: 'cfvc-sp-3',
    name: 'Klaus Weber',
    avatar: '',
    avatarUrl: SPEAKER_AVATARS.weber,
    bio: 'Dr.med.vet. · Tierklinik München',
    expertise: '心血管外科',
    region: '德国 · 慕尼黑',
    badgeText: '国际嘉宾',
    description: '<p>Klaus Weber 博士是德国 Tierklinik München 心血管外科主任，拥有 <strong>20 年以上</strong>小动物心血管手术经验。他是竑宇医疗 V-CLAMP 产品在欧洲 CE 认证过程中的关键临床合作专家，为产品的国际化推广提供了重要支持。</p>',
  },
  {
    id: 'cfvc-sp-6',
    name: '李某某',
    avatar: '',
    avatarUrl: SPEAKER_AVATARS.li,
    bio: 'CTO · 竑宇医疗',
    expertise: '产品研发',
    region: '中国 · 上海',
    badgeText: '企业代表',
    description: '<p>李某某是竑宇医疗联合创始人兼首席技术官，负责公司核心产品的研发与技术战略规划。他带领团队完成了 V-CLAMP 血管闭合系统从概念设计到量产的全流程，拥有多项核心技术专利。</p>',
  },
  {
    id: 'cfvc-sp-4',
    name: '王雪峰',
    avatar: '',
    avatarUrl: SPEAKER_AVATARS.wang,
    bio: '主任医师 · 中国农业大学动物医院',
    expertise: '肿瘤外科',
    region: '中国 · 北京',
    badgeText: '特邀专家',
    description: '<p>王雪峰主任医师是中国农业大学动物医院肿瘤外科主任，在犬猫肿瘤外科治疗领域享有盛誉。他参与竑宇医疗 V-CLAMP 产品在肿瘤切除手术中的临床应用研究，为产品在大口径血管闭合场景的应用提供了重要临床数据。</p>',
  },
  {
    id: 'cfvc-sp-5',
    name: 'Sarah Mitchell',
    avatar: '',
    avatarUrl: SPEAKER_AVATARS.mitchell,
    bio: 'DVM, DACVS · Cornell',
    expertise: '软组织外科',
    region: '美国 · 纽约',
    badgeText: '国际嘉宾',
    description: '<p>Sarah Mitchell 博士是美国 Cornell 大学兽医学院附属医院软组织外科专家，拥有 DVM 和 DACVS 双重资质。她在小动物软组织外科领域发表了 <strong>50+ 篇</strong>学术论文，是竑宇医疗在北美市场的重要学术合作伙伴。</p>',
  },
];

const CFVC_SPEAKERS_EN: SummitSeedSpeakerSeed[] = [
  {
    id: 'cfvc-sp-1',
    name: 'Dr. Zhang Mingyuan',
    avatar: '',
    avatarUrl: SPEAKER_AVATARS.zhang,
    bio: 'Chief Surgeon · Beijing Companion Animal Center Hospital',
    expertise: 'V-CLAMP Clinical',
    region: 'China · Beijing',
    badgeText: 'Featured Expert',
    description: '<p>Dr. Zhang Mingyuan has practiced small animal surgery at Beijing Companion Animal Center Hospital for over <strong>15 years</strong>, completing more than <strong>800 V-CLAMP</strong> vascular closure procedures.</p><p>As a core clinical validation expert for Hongyu Medical\'s V-CLAMP platform, he has led multi-center trials and authored the first edition of the V-CLAMP operative guidelines.</p>',
  },
  {
    id: 'cfvc-sp-2',
    name: 'Dr. Kenji Tanaka',
    avatar: '',
    avatarUrl: SPEAKER_AVATARS.tanaka,
    bio: 'Veterinary Ph.D. · Tokyo Small Animal Medical Center',
    expertise: 'Sports Medicine',
    region: 'Japan · Tokyo',
    badgeText: 'International Guest',
    description: '<p>Dr. Kenji Tanaka leads sports medicine at Tokyo Small Animal Medical Center with <strong>200+ arthroscopic repair cases</strong> and frequent international conference presentations.</p>',
  },
  {
    id: 'cfvc-sp-3',
    name: 'Dr. Klaus Weber',
    avatar: '',
    avatarUrl: SPEAKER_AVATARS.weber,
    bio: 'Dr.med.vet. · Tierklinik München',
    expertise: 'Cardiovascular Surgery',
    region: 'Germany · Munich',
    badgeText: 'International Guest',
    description: '<p>Dr. Klaus Weber directs cardiovascular surgery at Tierklinik München with over <strong>20 years</strong> of experience and served as a key clinical partner for V-CLAMP CE certification in Europe.</p>',
  },
  {
    id: 'cfvc-sp-6',
    name: 'Li XX',
    avatar: '',
    avatarUrl: SPEAKER_AVATARS.li,
    bio: 'CTO · Hongyu Medical',
    expertise: 'Product R&D',
    region: 'China · Shanghai',
    badgeText: 'Corporate Speaker',
    description: '<p>Li XX is co-founder and CTO of Hongyu Medical, leading V-CLAMP from concept through mass production with multiple core technology patents.</p>',
  },
  {
    id: 'cfvc-sp-4',
    name: 'Dr. Wang Xuefeng',
    avatar: '',
    avatarUrl: SPEAKER_AVATARS.wang,
    bio: 'Chief Surgeon · China Agricultural University Animal Hospital',
    expertise: 'Oncological Surgery',
    region: 'China · Beijing',
    badgeText: 'Featured Expert',
    description: '<p>Dr. Wang Xuefeng directs oncological surgery at CAU Animal Hospital and contributed pivotal clinical data for V-CLAMP in large-vessel closure during tumor resections.</p>',
  },
  {
    id: 'cfvc-sp-5',
    name: 'Dr. Sarah Mitchell',
    avatar: '',
    avatarUrl: SPEAKER_AVATARS.mitchell,
    bio: 'DVM, DACVS · Cornell',
    expertise: 'Soft Tissue Surgery',
    region: 'USA · New York',
    badgeText: 'International Guest',
    description: '<p>Dr. Sarah Mitchell is a soft tissue surgery specialist at Cornell with <strong>50+ peer-reviewed publications</strong> and a key academic partner for Hongyu Medical in North America.</p>',
  },
];

const CFVC_SPONSORS_ZH: SummitSeedSponsorSeed[] = [
  {
    id: 'cfvc-spn-d1',
    tier: 'diamond',
    name: '中宠股份',
    ...SPONSOR_LOGOS.chinapet,
    badgeText: 'Diamond Sponsor',
    intro: '国内领先的宠物食品与用品企业，致力于为全球宠物提供健康、安全的产品。本次大会钻石级合作伙伴，全面支持 CFVC 2026 学术议程与临床技能培训。',
  },
  {
    id: 'cfvc-spn-g1',
    tier: 'gold',
    name: '迈瑞动物医疗',
    ...SPONSOR_LOGOS.mindray,
    badgeText: 'Gold Sponsor',
    intro: '全球领先的医疗器械制造商，动物医疗影像与监护设备核心供应商。',
  },
  {
    id: 'cfvc-spn-g2',
    tier: 'gold',
    name: '瑞普生物',
    ...SPONSOR_LOGOS.ringpu,
    badgeText: 'Gold Sponsor',
    intro: '专注动物保健领域，提供疫苗、兽药及诊断一体化解决方案。',
  },
  {
    id: 'cfvc-spn-g3',
    tier: 'gold',
    name: 'IDEXX 爱德士',
    ...SPONSOR_LOGOS.idexx,
    badgeText: 'Gold Sponsor',
    intro: '全球动物诊断与软件解决方案领导者，为兽医提供精准诊疗工具。',
  },
  {
    id: 'cfvc-spn-s1',
    tier: 'silver',
    name: 'Vetoquinol',
    ...SPONSOR_LOGOS.vetoquinol,
    badgeText: 'Silver Sponsor',
    intro: '法国动保集团，专注小动物健康护理产品。',
  },
  {
    id: 'cfvc-spn-s2',
    tier: 'silver',
    name: '勃林格殷格翰',
    ...SPONSOR_LOGOS.boehringer,
    badgeText: 'Silver Sponsor',
    intro: '全球动保行业领先企业，疫苗与驱虫产品线完善。',
  },
  {
    id: 'cfvc-spn-s3',
    tier: 'silver',
    name: '硕腾 Zoetis',
    ...SPONSOR_LOGOS.zoetis,
    badgeText: 'Silver Sponsor',
    intro: '全球最大动物保健公司，覆盖预防、诊断与治疗全链条。',
  },
  {
    id: 'cfvc-spn-s4',
    tier: 'silver',
    name: '新瑞鹏集团',
    ...SPONSOR_LOGOS.rppet,
    badgeText: 'Silver Sponsor',
    intro: '中国领先宠物医疗连锁集团，覆盖全国 200+ 城市。',
  },
];

const CFVC_SPONSORS_EN: SummitSeedSponsorSeed[] = CFVC_SPONSORS_ZH.map((s) => ({
  ...s,
  intro: s.intro,
}));

export const SUMMIT_SEED_PROFILES: Record<string, SummitSeedProfile> = {
  'cfvc-2026': {
    coverMode: 'preset',
    coverPresetId: 'c-23',
    backgroundMode: 'preset',
    backgroundValue: 'u-07',
    showCoverOnBackground: true,
    videoLocalAsset: 'summit-hero.mp4',
    i18n: {
      'zh-CN': { stats: CFVC_STATS_ZH, speakers: CFVC_SPEAKERS_ZH, sponsors: CFVC_SPONSORS_ZH },
      en: { stats: CFVC_STATS_EN, speakers: CFVC_SPEAKERS_EN, sponsors: CFVC_SPONSORS_EN },
    },
  },

  'vmx-2027': {
    coverMode: 'preset',
    coverPresetId: 'c-23',
    backgroundMode: 'solid',
    backgroundValue: 'default',
    showCoverOnBackground: true,
    videoLocalAsset: 'summit-hero.mp4',
    i18n: {
      en: {
        stats: [
          { value: '2,000+', label: 'Seats' },
          { value: '12', label: 'Breakout Rooms' },
          { value: '80+', label: 'Exhibitors' },
          { value: '6', label: 'Days' },
        ],
        speakers: [
          { id: 'vmx-sp-1', name: 'Dr. Sarah Mitchell', avatar: '', avatarUrl: SPEAKER_AVATARS.mitchell, bio: 'DVM, DACVS · Cornell University College of Veterinary Medicine', expertise: 'Soft Tissue Surgery', region: 'USA · New York', badgeText: 'Keynote Speaker', description: '<p>Dr. Sarah Mitchell is a board-certified soft tissue surgeon at Cornell with extensive experience in minimally invasive companion animal procedures.</p>' },
          { id: 'vmx-sp-2', name: 'Dr. Robert Liu', avatar: '', avatarUrl: SPEAKER_AVATARS.liu, bio: 'CTO · Hongyu Medical', expertise: 'Medical Device R&D', region: 'China · Shanghai', badgeText: 'Corporate Speaker', description: '<p>Dr. Robert Liu leads Hongyu Medical\'s R&D portfolio including V-CLAMP and cardiac pacemaker platforms.</p>' },
          { id: 'vmx-sp-3', name: 'Dr. Amanda Chen', avatar: '', avatarUrl: SPEAKER_AVATARS.chen, bio: 'Conference Chair · VMX 2027', expertise: 'Veterinary Leadership', region: 'USA · Las Vegas', badgeText: 'Conference Chair', description: '<p>Dr. Amanda Chen chairs VMX 2027 and oversees the largest veterinary meeting program in North America.</p>' },
        ],
        sponsors: [
          { id: 'vmx-spn-g1', tier: 'gold', name: 'Hongyu Medical', ...SPONSOR_LOGOS.hongyu, badgeText: 'Gold Sponsor', intro: 'Presenting sponsor for the V-CLAMP Innovation Pavilion and cardiac device briefing sessions.' },
          { id: 'vmx-spn-g2', tier: 'gold', name: 'Zoetis', ...SPONSOR_LOGOS.zoetis, badgeText: 'Gold Sponsor', intro: 'Global animal health leader supporting VMX clinical education tracks.' },
        ],
      },
      'zh-CN': {
        stats: [
          { value: '2,000+', label: '主会场座位' },
          { value: '12', label: '分会场' },
          { value: '80+', label: '参展企业' },
          { value: '6', label: '会议天数' },
        ],
        speakers: [
          { id: 'vmx-sp-1', name: 'Sarah Mitchell 博士', avatar: '', avatarUrl: SPEAKER_AVATARS.mitchell, bio: 'DVM, DACVS · 康奈尔大学兽医学院', expertise: '软组织外科', region: '美国 · 纽约', badgeText: '主题演讲', description: '<p>Sarah Mitchell 博士是康奈尔大学认证软组织外科专家，在微创Companion动物手术领域经验丰富。</p>' },
          { id: 'vmx-sp-2', name: '刘某某', avatar: '', avatarUrl: SPEAKER_AVATARS.liu, bio: 'CTO · 竑宇医疗', expertise: '医疗器械研发', region: '中国 · 上海', badgeText: '企业代表', description: '<p>刘某某负责竑宇医疗 V-CLAMP 与心脏起搏器等核心产品研发。</p>' },
          { id: 'vmx-sp-3', name: 'Amanda Chen 博士', avatar: '', avatarUrl: SPEAKER_AVATARS.chen, bio: 'VMX 2027 大会主席', expertise: '兽医行业领导', region: '美国 · 拉斯维加斯', badgeText: '大会主席', description: '<p>Amanda Chen 博士担任 VMX 2027 大会主席，统筹北美最大兽医会议议程。</p>' },
        ],
        sponsors: [
          { id: 'vmx-spn-g1', tier: 'gold', name: '竑宇医疗', ...SPONSOR_LOGOS.hongyu, badgeText: 'Gold Sponsor', intro: 'V-CLAMP 创新展区与心脏器械发布环节 presenting 赞助商。' },
          { id: 'vmx-spn-g2', tier: 'gold', name: '硕腾 Zoetis', ...SPONSOR_LOGOS.zoetis, badgeText: 'Gold Sponsor', intro: '支持 VMX 临床教育板块的全球动保领军企业。' },
        ],
      },
    },
  },

  'jsava-2026': {
    coverMode: 'preset',
    coverPresetId: 'c-22',
    backgroundMode: 'preset',
    backgroundValue: 'u-05',
    showCoverOnBackground: true,
    i18n: {
      en: {
        stats: [
          { value: '1,200+', label: 'Attendees' },
          { value: '40+', label: 'Sessions' },
          { value: '15', label: 'Countries' },
          { value: '3', label: 'Days' },
        ],
        speakers: [
          { id: 'jsava-sp-1', name: 'Dr. Kenji Tanaka', avatar: '', avatarUrl: SPEAKER_AVATARS.tanaka, bio: 'Veterinary Ph.D. · Tokyo Small Animal Medical Center', expertise: 'Sports Medicine', region: 'Japan · Tokyo', badgeText: 'Symposium Chair', description: '<p>Dr. Kenji Tanaka chairs the V-CLAMP symposium and presents Japanese arthroscopic clinical outcomes.</p>' },
          { id: 'jsava-sp-2', name: 'Dr. Yuki Nakamura', avatar: '', avatarUrl: SPEAKER_AVATARS.nakamura, bio: 'JCVS Fellow · Osaka Veterinary University', expertise: 'Orthopedics', region: 'Japan · Osaka', badgeText: 'Featured Speaker', description: '<p>Dr. Yuki Nakamura specializes in orthopedic repair techniques with 150+ published case reviews.</p>' },
        ],
        sponsors: [
          { id: 'jsava-spn-g1', tier: 'gold', name: 'Hongyu Medical', ...SPONSOR_LOGOS.hongyu, badgeText: 'Gold Sponsor', intro: 'Host of the V-CLAMP Technical Symposium at JSAVA 2026.' },
        ],
      },
      'zh-CN': {
        stats: [
          { value: '1,200+', label: '预计参会' },
          { value: '40+', label: '学术场次' },
          { value: '15', label: '参与国家' },
          { value: '3', label: '会议天数' },
        ],
        speakers: [
          { id: 'jsava-sp-1', name: '田中健太', avatar: '', avatarUrl: SPEAKER_AVATARS.tanaka, bio: '兽医学博士 · 东京小动物医疗中心', expertise: '运动医学', region: '日本 · 东京', badgeText: '研讨会主席', description: '<p>田中健太博士主持 V-CLAMP 技术研讨会，分享日本关节镜临床成果。</p>' },
          { id: 'jsava-sp-2', name: '中村勇树', avatar: '', avatarUrl: SPEAKER_AVATARS.nakamura, bio: 'JCVS Fellow · 大阪兽医大学', expertise: '矫形外科', region: '日本 · 大阪', badgeText: '特邀讲者', description: '<p>中村勇树博士专注矫形修复技术，累计发表 150+ 例病例分析。</p>' },
        ],
        sponsors: [
          { id: 'jsava-spn-g1', tier: 'gold', name: '竑宇医疗', ...SPONSOR_LOGOS.hongyu, badgeText: 'Gold Sponsor', intro: 'JSAVA 2026 V-CLAMP 技术研讨会主办方。' },
        ],
      },
    },
  },

  'eurotier-2026': {
    coverMode: 'preset',
    coverPresetId: 'c-30',
    backgroundMode: 'solid',
    backgroundValue: 'default',
    showCoverOnBackground: true,
    i18n: {
      en: {
        stats: [
          { value: '100K+', label: 'Trade Visitors' },
          { value: '2,600+', label: 'Exhibitors' },
          { value: 'B2-108', label: 'Hongyu Booth' },
          { value: '4', label: 'Days' },
        ],
        speakers: [
          { id: 'et-sp-1', name: 'Dr. Klaus Weber', avatar: '', avatarUrl: SPEAKER_AVATARS.weber, bio: 'Dr.med.vet. · Tierklinik München', expertise: 'Cardiovascular Surgery', region: 'Germany · Munich', badgeText: 'Clinical Expert', description: '<p>Dr. Klaus Weber presents European V-CLAMP adoption data at the Hongyu booth technical briefing.</p>' },
          { id: 'et-sp-2', name: 'Dr. Maria Hoffmann', avatar: '', avatarUrl: SPEAKER_AVATARS.hoffmann, bio: 'Professor · Freie Universität Berlin', expertise: 'Veterinary Biomechanics', region: 'Germany · Berlin', badgeText: 'Academic Partner', description: '<p>Prof. Hoffmann discusses biomechanical validation of arthroscopic anchor systems.</p>' },
        ],
        sponsors: [
          { id: 'et-spn-d1', tier: 'diamond', name: 'Hongyu Medical', ...SPONSOR_LOGOS.hongyu, badgeText: 'Diamond Sponsor', intro: 'Diamond exhibitor at EuroTier 2026 showcasing V-CLAMP and sports medicine solutions.' },
        ],
      },
      'zh-CN': {
        stats: [
          { value: '10 万+', label: '专业观众' },
          { value: '2,600+', label: '参展企业' },
          { value: 'B2-108', label: '竑宇展位' },
          { value: '4', label: '展期天数' },
        ],
        speakers: [
          { id: 'et-sp-1', name: 'Klaus Weber 博士', avatar: '', avatarUrl: SPEAKER_AVATARS.weber, bio: 'Dr.med.vet. · 慕尼黑动物诊所', expertise: '心血管外科', region: '德国 · 慕尼黑', badgeText: '临床专家', description: '<p>Klaus Weber 博士在竑宇展位技术简报会上分享欧洲 V-CLAMP 应用数据。</p>' },
          { id: 'et-sp-2', name: 'Maria Hoffmann 教授', avatar: '', avatarUrl: SPEAKER_AVATARS.hoffmann, bio: '柏林自由大学', expertise: '兽医生物力学', region: '德国 · 柏林', badgeText: '学术合作伙伴', description: '<p>Hoffmann 教授介绍关节镜锚定系统的生物力学验证研究。</p>' },
        ],
        sponsors: [
          { id: 'et-spn-d1', tier: 'diamond', name: '竑宇医疗', ...SPONSOR_LOGOS.hongyu, badgeText: 'Diamond Sponsor', intro: 'EuroTier 2026 钻石级参展商，展示 V-CLAMP 与运动医学解决方案。' },
        ],
      },
    },
  },

  'ecvim-2025': {
    coverMode: 'preset',
    coverPresetId: 'c-21',
    backgroundMode: 'preset',
    backgroundValue: 'u-08',
    showCoverOnBackground: false,
    i18n: {
      en: {
        stats: [
          { value: '300+', label: 'Attendees' },
          { value: '15', label: 'Countries' },
          { value: '84', label: 'V-CLAMP Cases' },
          { value: '3', label: 'Days' },
        ],
        speakers: [
          { id: 'ecvim-sp-1', name: 'Dr. Pierre Dupont', avatar: '', avatarUrl: SPEAKER_AVATARS.dupont, bio: 'DECVIM-CA · École Nationale Vétérinaire de Lyon', expertise: 'Internal Medicine', region: 'France · Lyon', badgeText: 'Congress Chair', description: '<p>Dr. Pierre Dupont chaired ECVIM 2025 and co-hosted the Hongyu V-CLAMP symposium.</p>' },
          { id: 'ecvim-sp-2', name: 'Dr. Klaus Weber', avatar: '', avatarUrl: SPEAKER_AVATARS.weber, bio: 'Dr.med.vet. · Tierklinik München', expertise: 'Cardiovascular Surgery', region: 'Germany · Munich', badgeText: 'Keynote Speaker', description: '<p>Dr. Klaus Weber presented the first international disclosure of European multi-center V-CLAMP data.</p>' },
        ],
        sponsors: [
          { id: 'ecvim-spn-g1', tier: 'gold', name: 'Hongyu Medical', ...SPONSOR_LOGOS.hongyu, badgeText: 'Gold Sponsor', intro: 'Gold sponsor of the V-CLAMP Technical Symposium at ECVIM 2025.' },
          { id: 'ecvim-spn-s1', tier: 'silver', name: 'IDEXX', ...SPONSOR_LOGOS.idexx, badgeText: 'Silver Sponsor', intro: 'Supporting diagnostic education sessions at ECVIM 2025.' },
        ],
      },
      'zh-CN': {
        stats: [
          { value: '300+', label: '参会人数' },
          { value: '15', label: '参与国家' },
          { value: '84', label: 'V-CLAMP 病例' },
          { value: '3', label: '会议天数' },
        ],
        speakers: [
          { id: 'ecvim-sp-1', name: 'Pierre Dupont 博士', avatar: '', avatarUrl: SPEAKER_AVATARS.dupont, bio: 'DECVIM-CA · 里昂国立兽医学院', expertise: '内科学', region: '法国 · 里昂', badgeText: '大会主席', description: '<p>Pierre Dupont 博士担任 ECVIM 2025 大会主席，联合主持竑宇 V-CLAMP 技术研讨会。</p>' },
          { id: 'ecvim-sp-2', name: 'Klaus Weber 博士', avatar: '', avatarUrl: SPEAKER_AVATARS.weber, bio: 'Dr.med.vet. · 慕尼黑动物诊所', expertise: '心血管外科', region: '德国 · 慕尼黑', badgeText: '主题演讲', description: '<p>Klaus Weber 博士首次在国际会议上公开欧洲多中心 V-CLAMP 临床数据。</p>' },
        ],
        sponsors: [
          { id: 'ecvim-spn-g1', tier: 'gold', name: '竑宇医疗', ...SPONSOR_LOGOS.hongyu, badgeText: 'Gold Sponsor', intro: 'ECVIM 2025 V-CLAMP 技术研讨会金牌赞助商。' },
          { id: 'ecvim-spn-s1', tier: 'silver', name: 'IDEXX 爱德士', ...SPONSOR_LOGOS.idexx, badgeText: 'Silver Sponsor', intro: '支持 ECVIM 2025 诊断教育环节。' },
        ],
      },
    },
  },

  'hongyu-summit-2025': {
    coverMode: 'preset',
    coverPresetId: 'c-22',
    backgroundMode: 'solid',
    backgroundValue: 'default',
    showCoverOnBackground: true,
    videoLocalAsset: 'summit-hero.mp4',
    i18n: {
      en: {
        stats: [
          { value: '200+', label: 'Attendees' },
          { value: '50+', label: 'Certified Surgeons' },
          { value: '180+', label: 'V-CLAMP Cases' },
          { value: '2', label: 'Days' },
        ],
        speakers: [
          { id: 'hs25-sp-1', name: 'Dr. Zhang Mingyuan', avatar: '', avatarUrl: SPEAKER_AVATARS.zhang, bio: 'Chief Surgeon · Beijing Companion Animal Center Hospital', expertise: 'V-CLAMP Clinical', region: 'China · Beijing', badgeText: 'Featured Expert', description: '<p>Dr. Zhang presented the 2025 global V-CLAMP clinical review with 98.2% procedural success.</p>' },
          { id: 'hs25-sp-2', name: 'Dr. Wang Xuefeng', avatar: '', avatarUrl: SPEAKER_AVATARS.wang, bio: 'Chief Surgeon · China Agricultural University Animal Hospital', expertise: 'Oncological Surgery', region: 'China · Beijing', badgeText: 'Featured Expert', description: '<p>Dr. Wang shared first-year real-world data for the arthroscopic anchor system.</p>' },
          { id: 'hs25-sp-3', name: 'Dr. Kenji Tanaka', avatar: '', avatarUrl: SPEAKER_AVATARS.tanaka, bio: 'Veterinary Ph.D. · Tokyo Small Animal Medical Center', expertise: 'Sports Medicine', region: 'Japan · Tokyo', badgeText: 'International Guest', description: '<p>Dr. Tanaka joined the international surgeons round table on technique variations and outcomes.</p>' },
        ],
        sponsors: [
          { id: 'hs25-spn-d1', tier: 'diamond', name: 'Hongyu Medical', ...SPONSOR_LOGOS.hongyu, badgeText: 'Host', intro: 'Organizer of the Hongyu Medical Annual Academic Summit 2025.' },
          { id: 'hs25-spn-g1', tier: 'gold', name: 'Mindray Animal Medical', ...SPONSOR_LOGOS.mindray, badgeText: 'Gold Sponsor', intro: 'Gold sponsor providing imaging equipment for live demonstration sessions.' },
        ],
      },
      'zh-CN': {
        stats: [
          { value: '200+', label: '参会人数' },
          { value: '50+', label: '认证术者' },
          { value: '180+', label: 'V-CLAMP 手术' },
          { value: '2', label: '会议天数' },
        ],
        speakers: [
          { id: 'hs25-sp-1', name: '张明远', avatar: '', avatarUrl: SPEAKER_AVATARS.zhang, bio: '主任医师 · 北京伴侣动物中心医院', expertise: 'V-CLAMP 临床', region: '中国 · 北京', badgeText: '特邀专家', description: '<p>张明远主任医师发布 2025 全球 V-CLAMP 临床回顾，手术成功率达 98.2%。</p>' },
          { id: 'hs25-sp-2', name: '王雪峰', avatar: '', avatarUrl: SPEAKER_AVATARS.wang, bio: '主任医师 · 中国农业大学动物医院', expertise: '肿瘤外科', region: '中国 · 北京', badgeText: '特邀专家', description: '<p>王雪峰主任医师分享关节镜锚定系统首年真实世界临床数据。</p>' },
          { id: 'hs25-sp-3', name: '田中健太', avatar: '', avatarUrl: SPEAKER_AVATARS.tanaka, bio: '兽医学博士 · 东京小动物医疗中心', expertise: '运动医学', region: '日本 · 东京', badgeText: '国际嘉宾', description: '<p>田中健太博士参与国际术者圆桌，分享术式差异与患者预后经验。</p>' },
        ],
        sponsors: [
          { id: 'hs25-spn-d1', tier: 'diamond', name: '竑宇医疗', ...SPONSOR_LOGOS.hongyu, badgeText: 'Host', intro: '竑宇医疗年度学术大会 2025 主办方。' },
          { id: 'hs25-spn-g1', tier: 'gold', name: '迈瑞动物医疗', ...SPONSOR_LOGOS.mindray, badgeText: 'Gold Sponsor', intro: '金牌赞助商，为现场演示环节提供影像设备支持。' },
        ],
      },
    },
  },
};

export function getSummitSeedProfile(slug: string): SummitSeedProfile | null {
  return SUMMIT_SEED_PROFILES[slug] ?? null;
}

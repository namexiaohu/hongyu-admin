import type { BrandNarrativeSeedSlug } from '@/lib/brand-narrative-content';

export type BrandNarrativeLegacyPayload = {
  breadcrumbs?: unknown;
  hero: {
    eyebrow: string;
    title: string;
    lead: string;
    image: string;
    imageAlt?: string;
  };
  stats?: Array<{ value: string; suffix?: string; label: string }> | null;
  sections: Array<Record<string, unknown> & { type: string }>;
};

export type BrandNarrativeSeedTranslation = {
  locale: string;
  title: string;
  payload: BrandNarrativeLegacyPayload;
};

export type BrandNarrativeSeedRecord = {
  slug: BrandNarrativeSeedSlug;
  translations: BrandNarrativeSeedTranslation[];
};

const aboutZh: BrandNarrativeLegacyPayload = {
  breadcrumbs: [{ label: '首页', href: '/' }, { label: '企业介绍' }],
  hero: {
    eyebrow: 'About Us · 企业介绍',
    title: '以工程技术守护\n动物生命健康',
    lead: '竑宇医疗成立于动物医疗科技领域，致力于将精密工程技术与兽医学深度融合。从材料科学到机械设计，从临床验证到全球推广，每一步都以更高的手术精度和更好的术后预后为目标。',
    image: '/images/about-hero.jpg',
    imageAlt: '竑宇医疗企业介绍',
  },
  stats: [
    { value: '120', suffix: '+', label: '核心技术专利' },
    { value: '30', suffix: '+', label: '覆盖国家与地区' },
    { value: '5K', suffix: '+', label: '全球认证术者' },
    { value: '50', suffix: '+', label: '合作中心医院' },
  ],
  sections: [
    {
      type: 'split-content',
      id: 'mission',
      layout: 'team-split',
      imagePosition: 'left',
      eyebrow: 'Mission · 企业使命',
      title: '让每一次手术\n都更安全、更高效',
      body: '我们相信，宠物不是"小动物"，而是家庭的重要成员。宇医疗的每一项技术创新，都源于对动物生命的尊重和对兽医学未来的洞察。',
      bullets: [
        '以临床需求为导向，持续推动产品迭代',
        '与全球顶尖兽医机构共建循证医学体系',
        '通过认证培训赋能术者，提升行业整体水平',
        '以国际标准认证确保每一件产品的可靠性',
      ],
      image: '/images/about-team.jpg',
      imageAlt: '团队协作',
    },
    {
      type: 'header-grid',
      id: 'values',
      background: 'soft',
      grid: 'grid-3',
      eyebrow: 'Values · 核心价值',
      title: '驱动我们前行的力量',
      lead: '竑宇医疗的企业文化根植于对科学、品质和责任的坚守。',
      cards: [
        {
          cardStyle: 'value',
          icon: 'layers',
          title: '技术创新',
          body: '持续投入研发，每年将营收的 15% 以上用于新技术探索与产品升级，保持行业技术领先地位。',
        },
        {
          cardStyle: 'value',
          icon: 'check',
          title: '品质至上',
          body: '从原材料筛选到成品出厂，执行 ISO 13485 医疗器械质量管理体系，确保每件产品达到医疗级标准。',
        },
        {
          cardStyle: 'value',
          icon: 'users',
          title: '合作共赢',
          body: '与全球兽医学界、产业伙伴及监管机构建立开放透明的合作关系，共同推动宠物医疗行业进步。',
        },
      ],
    },
    {
      type: 'split-content',
      id: 'rd',
      layout: 'team-split',
      imagePosition: 'right',
      eyebrow: 'R&D · 研发实力',
      title: '跨学科研发团队\n驱动持续创新',
      body: '竑宇医疗汇聚了生物医学工程、材料科学、机械设计、兽医学等多学科背景的研发人才，建立了从概念验证到临床转化的完整创新链条。',
      bullets: [
        '拥有独立研发中心与 GMP 标准生产车间',
        '与多所重点高校建立产学研合作基地',
        '研发团队中硕士及以上学历占比超过 60%',
        '累计获得国内外发明专利 120+ 项',
      ],
      image: '/images/about-lab.jpg',
      imageAlt: '研发实验室',
    },
    {
      type: 'header-grid',
      id: 'certs',
      background: 'soft',
      grid: 'grid-2',
      eyebrow: 'Certifications · 资质认证',
      title: '国际标准品质保障',
      lead: '产品通过多项国际权威认证，满足全球各区域市场准入要求。',
      cards: [
        { cardStyle: 'cert', title: 'ISO 13485', body: '医疗器械质量管理体系认证，确保产品从设计到交付的全流程质量管控。' },
        { cardStyle: 'cert', title: 'ISO 10993', body: '医疗器械生物学评价，产品生物相容性通过细胞毒性、致敏性等全面测试。' },
        { cardStyle: 'cert', title: 'CE 标志', body: '符合欧盟医疗器械法规要求，获准在欧洲经济区自由流通与销售。' },
        { cardStyle: 'cert', title: 'FDA 510(k)', body: '美国 FDA 上市前通知申请中，推动产品进入北美市场的关键认证步骤。' },
      ],
    },
    {
      type: 'cta',
      id: 'cta',
      anchorId: 'contact',
      eyebrow: 'Contact · 联系我们',
      title: '了解竑宇医疗',
      lead: '无论是商务合作、技术交流还是媒体采访，我们都期待与您对话。',
      href: 'mailto:contact@hongyu-medical.com',
      buttonLabel: '商务合作咨询',
    },
  ],
};

const patentsZh: BrandNarrativeLegacyPayload = {
  breadcrumbs: [{ label: '首页', href: '/' }, { label: '技术专利' }],
  hero: {
    eyebrow: 'Technology · 技术专利',
    title: '120+ 项核心专利\n构筑技术壁垒',
    lead: '竑宇医疗持续投入研发创新，在血管闭合、微创手术、生物材料等领域建立了完整的自主知识产权体系。',
    image: '/images/patent-hero.jpg',
    imageAlt: '技术研发',
  },
  stats: [
    { value: '120', suffix: '+', label: '授权发明专利' },
    { value: '45', suffix: '+', label: 'PCT 国际专利' },
    { value: '15', suffix: '%', label: '年营收研发投入占比' },
    { value: '60', suffix: '%+', label: '研发团队硕士以上占比' },
  ],
  sections: [
    {
      type: 'patent-grid',
      id: 'patents',
      eyebrow: 'Core Patents · 核心专利',
      title: '关键技术布局',
      lead: '覆盖血管闭合、微创器械、生物材料、智能控制四大技术方向。',
      items: [
        {
          patentId: 'CN 2024 1 XXXXXX.X',
          title: '自适应压力反馈血管闭合装置',
          body: '基于微型压力传感器的实时夹持力调节技术，实现血管闭合过程中损伤最小化。',
          tags: ['V-CLAMP', '发明专利', '已授权'],
        },
        {
          patentId: 'CN 2023 1 XXXXXX.X',
          title: '生物相容性钛合金涂层制备方法',
          body: '医用级 Ti-6Al-4V 涂层工艺，通过 ISO 10993 细胞毒性测试，降低组织排异反应。',
          tags: ['材料科学', '发明专利', '已授权'],
        },
        {
          patentId: 'CN 2023 2 XXXXXX.X',
          title: '单手快速释放血管夹持机构',
          body: '单手操作一键释放设计，闭合后 3 秒内完成器械撤出，提升手术效率。',
          tags: ['机械设计', '实用新型', '已授权'],
        },
        {
          patentId: 'CN 2024 1 XXXXXX.X',
          title: '可吸收性外科缝合锚钉系统',
          body: '生物可吸收材料制成的关节固定锚钉，术后无需二次取出，6-12 个月完全降解。',
          tags: ['运动医学', '发明专利', '申请中'],
        },
        {
          patentId: 'CN 2024 1 XXXXXX.X',
          title: '微型植入式心脏起搏器电极设计',
          body: '专为中小体型犬猫设计的低阻抗电极结构，延长电池寿命至 8 年以上。',
          tags: ['心血管', '发明专利', '申请中'],
        },
        {
          patentId: 'PCT/CN2024/XXXXXX',
          title: '智能手术导航定位系统',
          body: '基于光学追踪的术中实时导航，辅助术者精确定位病灶与血管走向。',
          tags: ['智能控制', 'PCT 国际', '申请中'],
        },
      ],
    },
    {
      type: 'split-content',
      id: 'rd',
      background: 'soft',
      layout: 'rd-split',
      imagePosition: 'left',
      eyebrow: 'R&D · 研发能力',
      title: '从概念到临床的\n完整创新链条',
      body: '宇医疗拥有独立的研发中心与 GMP 标准生产车间，建立了从基础研究、工程开发、注册申报到临床转化的全周期创新体系。',
      bullets: [
        '生物医学工程实验室：材料表征、力学测试、生物相容性评价',
        '精密机械加工车间：CNC 五轴加工、激光焊接、表面处理',
        '洁净装配车间：ISO 7 级洁净环境，满足无菌器械装配要求',
        '临床前研究平台：动物实验中心，支持产品性能验证与安全性评价',
      ],
      image: '/images/patent-lab.jpg',
      imageAlt: '研发中心',
    },
    {
      type: 'header-grid',
      id: 'innovation',
      grid: 'grid-3',
      eyebrow: 'Innovation · 创新亮点',
      title: '技术突破与行业认可',
      lead: '每一项创新都来自对临床痛点的深度洞察与工程突破。',
      cards: [
        {
          cardStyle: 'innovation',
          year: '2024',
          title: '智能压力反馈技术获行业创新奖',
          body: 'V-CLAMP 核心专利技术获 2024 中国宠物医疗科技创新奖，被评为"年度最具临床价值技术"。',
          image: '/images/patent-microscope.jpg',
        },
        {
          cardStyle: 'innovation',
          year: '2024',
          title: '产学研合作基地落户',
          body: '与 3 所重点高校共建产学研合作基地，联合培养医疗器械领域高层次技术人才。',
          image: '/images/patent-engineer.jpg',
        },
        {
          cardStyle: 'innovation',
          year: '2025',
          title: '新一代生物可吸收材料研发突破',
          body: '自主研发的 PLGA 基可吸收材料完成动物实验，降解周期可控在 6-12 个月范围内。',
          image: '/images/patent-lab.jpg',
        },
      ],
    },
    {
      type: 'cta',
      id: 'cta',
      anchorId: 'contact',
      eyebrow: 'Contact · 联系我们',
      title: '了解技术合作机会',
      lead: '无论是技术授权、联合研发还是学术交流，我们都开放对话。',
      href: 'mailto:contact@hongyu-medical.com',
      buttonLabel: '商务合作咨询',
    },
  ],
};

const historyZh: BrandNarrativeLegacyPayload = {
  breadcrumbs: [{ label: '首页', href: '/' }, { label: '发展历程' }],
  hero: {
    eyebrow: 'History · 发展历程',
    title: '从实验室到全球\n的十二年征程',
    lead: '自 2014 年创立以来，竑宇医疗始终专注于动物医疗器械的自主研发与产业化，逐步成长为行业领先的技术驱动型企业。',
    image: '/images/history-hero.jpg',
    imageAlt: '发展历程',
  },
  sections: [
    {
      type: 'timeline',
      id: 'timeline',
      eyebrow: 'Milestones · 关键节点',
      title: '十二年发展历程',
      lead: '从核心技术突破到全球化布局，每一步都印证着我们对创新的坚持。',
      items: [
        {
          year: '2014',
          title: '公司创立，聚焦动物外科器械',
          body: '竑宇医疗在上海成立，创始团队由生物医学工程与兽医学跨学科背景专家组成，确立以精密工程技术赋能宠物医疗的发展方向。',
          tags: ['创立', '上海'],
        },
        {
          year: '2016',
          title: 'V-CLAMP 概念验证完成',
          body: '首款核心产品 V-CLAMP 血管闭合系统完成原理样机开发，通过动物实验验证，关键技术指标达到预期目标。',
          tags: ['V-CLAMP', '原型验证'],
        },
        {
          year: '2018',
          title: '首个产品获得 CE 认证',
          body: 'V-CLAMP 100 系列正式获得 CE 标志认证，标志着产品达到欧盟医疗器械法规要求，开始进入欧洲市场。',
          tags: ['CE 认证', '国际化'],
          image: '/images/history-ceremony.jpg',
          imageAlt: 'CE 认证',
        },
        {
          year: '2020',
          title: '运动医学产品线发布',
          body: '推出关节镜辅助手术系统、生物锚定韧带修复装置等运动医学产品，业务从血管管理拓展至骨科与运动系统。',
          tags: ['运动医学', '产品线拓展'],
        },
        {
          year: '2022',
          title: '全球化布局加速',
          body: '产品覆盖 20+ 个国家与地区，与全球 30+ 家动物医院建立合作中心，认证术者超过 2,000 人。研发中心扩建，GMP 车间投产。',
          tags: ['全球化', 'GMP 车间'],
          image: '/images/history-global.jpg',
          imageAlt: '全球化布局',
        },
        {
          year: '2024',
          title: '心脏起搏器进入临床',
          body: '微型植入式心脏起搏器完成动物实验，进入多中心临床试验阶段。同期，公司累计授权专利突破 100 项。',
          tags: ['心脏起搏器', '临床试验', '100+ 专利'],
        },
        {
          year: '2026',
          title: '新一代产品管线成型',
          body: '智能手术导航系统、生物可吸收材料等下一代产品完成概念验证，V-CLAMP 累计手术案例突破 20 万例。公司启动 FDA 510(k) 注册申请。',
          tags: ['智能导航', 'FDA 申请', '200K+ 案例'],
          image: '/images/history-office.jpg',
          imageAlt: '新一代研发',
        },
      ],
    },
    {
      type: 'header-grid',
      id: 'outlook',
      background: 'soft',
      grid: 'grid-3',
      eyebrow: 'Outlook · 未来展望',
      title: '持续创新，引领未来',
      lead: '竑宇医疗将继续深耕技术创新，推动宠物医疗器械行业迈向更高标准。',
      cards: [
        { cardStyle: 'outlook', year: '2027', title: 'FDA 510(k) 获批', body: '完成美国 FDA 上市前通知审批，正式进入北美市场，实现全球三大市场全覆盖。' },
        { cardStyle: 'outlook', year: '2028', title: 'AI 辅助手术系统', body: '基于光学追踪与机器学习的术中实时辅助系统进入临床验证，开启智能外科新纪元。' },
        { cardStyle: 'outlook', year: '2030', title: '全球认证术者突破 10,000', body: '认证培训体系覆盖 50+ 国家，构建全球最大的宠物外科术者专业社区。' },
      ],
    },
    {
      type: 'cta',
      id: 'cta',
      anchorId: 'contact',
      eyebrow: 'Contact · 联系我们',
      title: '与我们共同成长',
      lead: '无论是加入我们的团队，还是成为合作伙伴，竑宇医疗期待您的加入。',
      href: 'mailto:contact@hongyu-medical.com',
      buttonLabel: '商务合作咨询',
    },
  ],
};

const trainingZh: BrandNarrativeLegacyPayload = {
  breadcrumbs: [{ label: '首页', href: '/' }, { label: '培训计划' }],
  hero: {
    eyebrow: 'Training Program · 培训计划',
    title: '认证术者\n培训体系',
    lead: '从理论学习到实操考核，系统化培养掌握 V-CLAMP 等核心产品标准操作流程的专业兽医师。',
    image: '/images/edu-2.jpg',
    imageAlt: '培训计划',
  },
  stats: [
    { value: '5,280', suffix: '', label: '已认证术者' },
    { value: '32', suffix: '', label: '覆盖国家' },
    { value: '96', suffix: '%', label: '考核通过率' },
    { value: '12', suffix: '', label: '培训基地' },
  ],
  sections: [
    {
      type: 'course',
      id: 'programs',
      eyebrow: 'Courses · 培训课程',
      title: '分级培训课程',
      lead: '根据术者经验与专业方向，提供从基础到高级的完整培训路径。',
      courses: [
        {
          badge: '基础级',
          title: 'V-CLAMP 标准操作入门',
          description: '面向初次接触 V-CLAMP 的兽医师，系统讲解产品原理、操作步骤与并发症处理。包含在线理论学习与模拟实操。',
          image: '/images/edu-1.jpg',
          totalHours: '8 课时',
          teachingFormat: '线上 + 线下',
          trainingCycle: '3 天',
        },
        {
          badge: '进阶级',
          title: '认证术者工作坊',
          description: '线下实操训练 + 病例讨论，由资深术者带教。完成考核后获得竑宇医疗认证术者资质，可独立开展 V-CLAMP 手术。',
          image: '/images/edu-2.jpg',
          totalHours: '16 课时',
          teachingFormat: '线下实操',
          trainingCycle: '5 天',
        },
        {
          badge: '高级',
          title: '铂金术者导师计划',
          description: '面向已认证术者的进阶培养，培养区域培训导师。参与课程开发、带教新术者，并代表竑宇出席行业会议。',
          image: '/images/edu-3.jpg',
          totalHours: '24 课时',
          teachingFormat: '导师带教',
          trainingCycle: '持续',
        },
        {
          badge: '专题',
          title: '运动医学专项培训',
          description: '针对关节镜手术、韧带修复等运动医学产品的专项技能培训，包含设备操作、手术入路选择与术后康复指导。',
          image: '/images/sol-feature1.jpg',
          totalHours: '12 课时',
          teachingFormat: '线下实操',
          trainingCycle: '4 天',
        },
      ],
    },
    {
      type: 'timeline',
      id: 'schedule',
      eyebrow: 'Schedule · 近期排期',
      title: '2026 年培训计划',
      items: [
        { year: '2026.09 · 上海', title: 'V-CLAMP 认证术者工作坊（第 28 期）', body: '名额 20 人，剩余 6 席' },
        { year: '2026.10 · 慕尼黑', title: '欧洲区 V-CLAMP 培训（英文）', body: '名额 15 人，剩余 11 席' },
        { year: '2026.11 · 东京', title: '运动医学专项培训（日文）', body: '名额 12 人，剩余 8 席' },
        { year: '2026.12 · 北京', title: '铂金术者导师计划（第 3 期）', body: '名额 8 人，剩余 3 席' },
      ],
    },
    {
      type: 'cta',
      id: 'cta',
      containerWrap: true,
      eyebrow: 'Apply · 申请培训',
      title: '成为竑宇认证术者',
      lead: '填写申请信息，我们的培训协调员将在 3 个工作日内与您联系。',
      href: '/contact',
      buttonLabel: '申请参加培训',
    },
  ],
};

function buildTranslations(
  slug: BrandNarrativeSeedSlug,
  zhPayload: BrandNarrativeLegacyPayload,
  listTitle: string,
): BrandNarrativeSeedTranslation[] {
  return [{
    locale: 'zh-CN',
    title: listTitle,
    payload: zhPayload,
  }];
}

export const brandNarrativeSeedRecords: BrandNarrativeSeedRecord[] = [
  {
    slug: 'about',
    translations: buildTranslations('about', aboutZh, '企业介绍'),
  },
  {
    slug: 'patents',
    translations: buildTranslations('patents', patentsZh, '技术专利'),
  },
  {
    slug: 'history',
    translations: buildTranslations('history', historyZh, '发展历程'),
  },
  {
    slug: 'training',
    translations: buildTranslations('training', trainingZh, '培训计划'),
  },
];

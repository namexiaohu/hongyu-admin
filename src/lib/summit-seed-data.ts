import type { AgendaGroup, SpeakerItem } from '@/lib/summit-content';

export type SummitSeedRecord = {
  slug: string;
  status: 'upcoming' | 'registering' | 'completed';
  startDate: string;
  endDate: string;
  coverImageUrl: string;
  venueImageUrl: string;
  sortOrder: number;
  agenda: AgendaGroup[];
  i18n: Record<string, {
    title: string;
    description: string;
    scale: string;
    duration: string;
    location: string;
    address: string;
    transportation: string;
    speakers: SpeakerItem[];
  }>;
};

export const SUMMIT_SEED_RECORDS: SummitSeedRecord[] = [
  // ──── UPCOMING / REGISTERING ────

  {
    slug: 'vmx-2027',
    status: 'registering',
    startDate: '2027-03-04T08:00:00Z',
    endDate: '2027-03-09T18:00:00Z',
    coverImageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80',
    venueImageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80',
    sortOrder: 10,
    agenda: [
      {
        id: 'vmx-grp-1',
        dayLabel: 'DAY 1 · Mar 4',
        groupTitle: 'Opening & Keynote Sessions',
        items: [
          { id: 'vmx-item-1', startTime: '09:00', endTime: '09:30', title: 'Opening Ceremony', desc: 'Welcome address and overview of the veterinary industry landscape in 2027.', speaker: 'Dr. Amanda Chen · VMX Chair' },
          { id: 'vmx-item-2', startTime: '09:30', endTime: '10:30', title: 'Keynote: Next-Gen Surgical Devices for Small Animals', desc: 'Showcasing the latest V-CLAMP innovations and cardiac pacemaker developments for companion animals.', speaker: 'Dr. Robert Liu · Hongyu Medical CTO' },
          { id: 'vmx-item-3', startTime: '14:00', endTime: '17:00', title: 'Hands-On Workshops (4 Tracks)', desc: 'V-CLAMP advanced techniques / Arthroscopic surgery / Cardiac device implantation / Case discussion', speaker: 'Multiple Certified Surgeons' },
        ],
      },
      {
        id: 'vmx-grp-2',
        dayLabel: 'DAY 2 · Mar 5',
        groupTitle: 'Technical Workshops & Regulatory Updates',
        items: [
          { id: 'vmx-item-4', startTime: '09:00', endTime: '12:00', title: 'FDA Registration Progress for Cardiac Pacemaker', desc: 'Update on the FDA 510(k) submission timeline and clinical trial milestones for the Hongyu cardiac pacemaker.', speaker: 'Dr. Sarah Mitchell · DVM, DACVS' },
          { id: 'vmx-item-5', startTime: '14:00', endTime: '16:00', title: 'Sports Medicine Product Demo Session', desc: 'Live demonstration of arthroscopic anchor systems and bone tunnel preparation techniques.', speaker: 'Expert Sports Medicine Panel' },
        ],
      },
    ],
    i18n: {
      en: {
        title: 'VMX 2027 Veterinary Meeting & Expo',
        description: 'The largest veterinary conference in North America. Hongyu Medical will debut its cardiac pacemaker product and host an FDA registration progress briefing. Join us for hands-on workshops, keynote presentations, and the latest in companion animal surgical technology.',
        scale: 'Main Hall 2,000+ seats + 12 breakout rooms',
        duration: '6 Days',
        location: 'Las Vegas, USA',
        address: 'Orange County Convention Center, Las Vegas, NV',
        transportation: '5 minutes from Las Vegas Harry Reid International Airport (LAS) via shuttle service. On-site parking available.',
        speakers: [
          { id: 'vmx-sp-1', name: 'Dr. Sarah Mitchell', avatar: '', bio: 'DVM, DACVS · Cornell University College of Veterinary Medicine', expertise: 'Soft Tissue Surgery' },
          { id: 'vmx-sp-2', name: 'Dr. Robert Liu', avatar: '', bio: 'CTO · Hongyu Medical', expertise: 'Medical Device R&D' },
          { id: 'vmx-sp-3', name: 'Dr. Amanda Chen', avatar: '', bio: 'Conference Chair · VMX 2027', expertise: 'Veterinary Leadership' },
        ],
      },
      'zh-CN': {
        title: 'VMX 2027 兽医会议与博览会',
        description: '北美最大兽医会议，竑宇医疗将首次展示心脏起搏器产品，并举办 FDA 注册进展发布会，同期开设 V-CLAMP 手术技术工作坊。',
        scale: '主会场 2,000+ 座 + 12 个分会场',
        duration: '6 天',
        location: '美国 · 拉斯维加斯',
        address: 'Orange County Convention Center, Las Vegas, NV',
        transportation: '从拉斯维加斯哈里·里德国际机场 (LAS) 乘接驳车约 5 分钟。',
        speakers: [
          { id: 'vmx-sp-1', name: 'Sarah Mitchell 博士', avatar: '', bio: 'DVM, DACVS · 康奈尔大学兽医学院', expertise: '软组织外科' },
          { id: 'vmx-sp-2', name: '刘某某', avatar: '', bio: 'CTO · 竑宇医疗', expertise: '医疗器械研发' },
          { id: 'vmx-sp-3', name: 'Amanda Chen 博士', avatar: '', bio: 'VMX 2027 大会主席', expertise: '兽医行业领导' },
        ],
      },
    },
  },

  {
    slug: 'cfvc-2026',
    status: 'upcoming',
    startDate: '2026-12-10T08:00:00Z',
    endDate: '2026-12-14T18:00:00Z',
    coverImageUrl: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=1200&q=80',
    venueImageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80',
    sortOrder: 20,
    agenda: [
      {
        id: 'cfvc-grp-1',
        dayLabel: 'DAY 1 · Dec 10',
        groupTitle: 'Opening Ceremony & Keynote Presentations',
        items: [
          { id: 'cfvc-item-1', startTime: '09:00', endTime: '09:30', title: 'Opening Address', desc: 'Welcome by Hongyu Medical founder, reviewing 2026 clinical milestones and global expansion.', speaker: 'Wang XX · CEO' },
          { id: 'cfvc-item-2', startTime: '09:30', endTime: '10:30', title: 'Keynote: V-CLAMP Global Clinical Data Release', desc: 'Publication of 2024–2026 multi-center clinical research data covering 328 surgical cases across 6 countries.', speaker: 'Dr. Zhang Mingyuan · Chief Surgeon' },
          { id: 'cfvc-item-3', startTime: '10:45', endTime: '12:00', title: 'Session: Sports Medicine Clinical Data from Japan', desc: 'Dr. Kenji Tanaka shares 200+ cases of arthroscopic-assisted repair in Japan.', speaker: 'Dr. Kenji Tanaka' },
          { id: 'cfvc-item-4', startTime: '14:00', endTime: '17:00', title: 'Parallel Workshops (4 Tracks)', desc: 'V-CLAMP standard procedure / Arthroscopy / Pacemaker fundamentals / Case discussion', speaker: 'Multiple Certified Surgeons' },
        ],
      },
      {
        id: 'cfvc-grp-2',
        dayLabel: 'DAY 2 · Dec 11',
        groupTitle: 'Advanced Workshops & Hands-On Training',
        items: [
          { id: 'cfvc-item-5', startTime: '09:00', endTime: '12:00', title: 'Advanced V-CLAMP Workshop', desc: 'Advanced V-CLAMP techniques on animal models, covering complex vascular branch management.', speaker: 'Platinum-Level Certified Surgeons' },
          { id: 'cfvc-item-6', startTime: '14:00', endTime: '17:00', title: 'Sports Medicine Hands-On Training', desc: 'Practical training in arthroscope operation, bone tunnel preparation, and biological anchor implantation.', speaker: 'Sports Medicine Expert Panel' },
        ],
      },
      {
        id: 'cfvc-grp-3',
        dayLabel: 'DAY 3 · Dec 12',
        groupTitle: 'Product Roadmap & Closing Ceremony',
        items: [
          { id: 'cfvc-item-7', startTime: '09:00', endTime: '10:30', title: 'Product Roadmap: 2027 New Products Preview', desc: 'First public reveal of the intelligent surgical navigation system and next-generation bioabsorbable materials.', speaker: 'Li XX · CTO' },
          { id: 'cfvc-item-8', startTime: '10:45', endTime: '12:00', title: 'Panel Discussion: The Next Decade of Veterinary Surgery', desc: 'Four leading veterinarians from China, Japan, Germany and USA discuss industry trends and technical challenges.', speaker: 'Four Distinguished Speakers' },
          { id: 'cfvc-item-9', startTime: '14:00', endTime: '15:00', title: 'Closing Ceremony & Annual Surgeon Awards', desc: 'Recognition of outstanding surgeons, Platinum Certification awards, and preview of 2027 training program.', speaker: 'Wang XX · CEO' },
        ],
      },
    ],
    i18n: {
      en: {
        title: 'China Feline & Veterinary Conference (CFVC) 2026',
        description: 'Hongyu Medical\'s annual flagship academic summit, bringing together certified surgeons from around the world to share the latest V-CLAMP clinical research and product roadmap. Featuring keynote presentations, technical workshops, case discussions, and hands-on training across 5 days.',
        scale: 'Main Hall 500 seats + 4 breakout venues',
        duration: '5 Days',
        location: 'Beijing, China',
        address: 'China National Convention Center, 7 Tianchen East Road, Chaoyang District, Beijing',
        transportation: 'Exit D of Olympic Park Station on Metro Line 8, 5-minute walk.',
        speakers: [
          { id: 'cfvc-sp-1', name: 'Dr. Zhang Mingyuan', avatar: '', bio: 'Chief Surgeon · Beijing Companion Animal Center Hospital', expertise: 'V-CLAMP Clinical' },
          { id: 'cfvc-sp-2', name: 'Dr. Kenji Tanaka', avatar: '', bio: 'Veterinary Ph.D. · Tokyo Small Animal Medical Center', expertise: 'Sports Medicine' },
          { id: 'cfvc-sp-3', name: 'Dr. Klaus Weber', avatar: '', bio: 'Dr.med.vet. · Tierklinik München', expertise: 'Cardiovascular Surgery' },
          { id: 'cfvc-sp-4', name: 'Dr. Wang Xuefeng', avatar: '', bio: 'Chief Surgeon · China Agricultural University Animal Hospital', expertise: 'Oncological Surgery' },
          { id: 'cfvc-sp-5', name: 'Dr. Sarah Mitchell', avatar: '', bio: 'DVM, DACVS · Cornell', expertise: 'Soft Tissue Surgery' },
        ],
      },
      'zh-CN': {
        title: '中国小动物兽医大会（CFVC）2026',
        description: '竑宇医疗主办的年度学术盛会，汇聚全球认证术者，分享 V-CLAMP 最新临床研究成果与产品路线图。设置主题演讲、技术工作坊、病例讨论与实操培训四大板块。',
        scale: '主会场 500 座 + 4 个分会场',
        duration: '5 天',
        location: '中国 · 北京',
        address: '北京市朝阳区天辰东路 7 号 北京国家会议中心',
        transportation: '地铁 8 号线奥林匹克公园站 D 出口步行 5 分钟',
        speakers: [
          { id: 'cfvc-sp-1', name: '张明远', avatar: '', bio: '主任医师 · 北京伴侣动物中心医院', expertise: 'V-CLAMP 临床' },
          { id: 'cfvc-sp-2', name: '田中健太', avatar: '', bio: '兽医学博士 · 东京小动物医疗中心', expertise: '运动医学' },
          { id: 'cfvc-sp-3', name: 'Klaus Weber', avatar: '', bio: 'Dr.med.vet. · Tierklinik München', expertise: '心血管外科' },
          { id: 'cfvc-sp-4', name: '王雪峰', avatar: '', bio: '主任医师 · 中国农业大学动物医院', expertise: '肿瘤外科' },
          { id: 'cfvc-sp-5', name: 'Sarah Mitchell', avatar: '', bio: 'DVM, DACVS · Cornell', expertise: '软组织外科' },
        ],
      },
    },
  },

  {
    slug: 'jsava-2026',
    status: 'upcoming',
    startDate: '2026-11-06T08:00:00Z',
    endDate: '2026-11-08T18:00:00Z',
    coverImageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80',
    venueImageUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&q=80',
    sortOrder: 30,
    agenda: [],
    i18n: {
      en: {
        title: 'Japan Small Animal Veterinary Association Annual Meeting 2026',
        description: 'Hongyu Medical will host a dedicated V-CLAMP symposium and present Japanese clinical data for its sports medicine product line at this prestigious annual gathering of Japan\'s top small animal veterinary specialists.',
        scale: '1,200+ attendees expected',
        duration: '3 Days',
        location: 'Tokyo, Japan',
        address: 'Tokyo International Forum, 3-5-1 Marunouchi, Chiyoda City, Tokyo',
        transportation: '1-minute walk from JR Yurakucho Station. 3 minutes from Tokyo Station (Kokusai Forum exit).',
        speakers: [
          { id: 'jsava-sp-1', name: 'Dr. Kenji Tanaka', avatar: '', bio: 'Veterinary Ph.D. · Tokyo Small Animal Medical Center', expertise: 'Sports Medicine' },
          { id: 'jsava-sp-2', name: 'Dr. Yuki Nakamura', avatar: '', bio: 'JCVS Fellow · Osaka Veterinary University', expertise: 'Orthopedics' },
        ],
      },
      'zh-CN': {
        title: '日本小动物兽医学会年会 2026',
        description: '竑宇医疗将在此次日本顶级小动物兽医专科学术年会上举办 V-CLAMP 技术研讨会，并展示运动医学产品的日本临床数据。',
        scale: '预计 1,200+ 参会',
        duration: '3 天',
        location: '日本 · 东京',
        address: '东京国际论坛，东京都千代田区丸之内 3-5-1',
        transportation: 'JR 有乐町站步行 1 分钟，东京站（国际论坛口）步行 3 分钟。',
        speakers: [
          { id: 'jsava-sp-1', name: '田中健太', avatar: '', bio: '兽医学博士 · 东京小动物医疗中心', expertise: '运动医学' },
          { id: 'jsava-sp-2', name: '中村勇树', avatar: '', bio: 'JCVS Fellow · 大阪兽医大学', expertise: '矫形外科' },
        ],
      },
    },
  },

  {
    slug: 'eurotier-2026',
    status: 'upcoming',
    startDate: '2026-10-13T08:00:00Z',
    endDate: '2026-10-16T18:00:00Z',
    coverImageUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&q=80',
    venueImageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&q=80',
    sortOrder: 40,
    agenda: [],
    i18n: {
      en: {
        title: 'EuroTier 2026 International Livestock Technology Exhibition',
        description: 'The world\'s largest livestock technology trade fair. Hongyu Medical will showcase the latest generation of V-CLAMP products and its complete sports medicine solution line at Booth B2-108.',
        scale: '100,000+ trade visitors expected',
        duration: '4 Days',
        location: 'Hanover, Germany',
        address: 'Deutsche Messe Hannover, Messegelände, 30521 Hannover, Germany',
        transportation: 'Hannover-Messe/Laatzen station is directly adjacent to the exhibition grounds — served by U-Bahn Line 8 from Hannover Hauptbahnhof (10 min).',
        speakers: [
          { id: 'et-sp-1', name: 'Dr. Klaus Weber', avatar: '', bio: 'Dr.med.vet. · Tierklinik München', expertise: 'Cardiovascular Surgery' },
          { id: 'et-sp-2', name: 'Dr. Maria Hoffmann', avatar: '', bio: 'Professor · Freie Universität Berlin', expertise: 'Veterinary Biomechanics' },
        ],
      },
      'zh-CN': {
        title: 'EuroTier 2026 国际畜牧技术展',
        description: '全球最大的畜牧技术展览会，竑宇医疗将在 B2-108 展位展示 V-CLAMP 最新一代产品及运动医学解决方案。',
        scale: '预计 10 万+ 专业观众',
        duration: '4 天',
        location: '德国 · 汉诺威',
        address: '德国汉诺威展览中心，Messegelände, 30521 Hannover',
        transportation: '汉诺威展览/Laatzen 站紧邻展馆，从汉诺威中央火车站乘 U8 线约 10 分钟。',
        speakers: [
          { id: 'et-sp-1', name: 'Klaus Weber 博士', avatar: '', bio: 'Dr.med.vet. · 慕尼黑动物诊所', expertise: '心血管外科' },
          { id: 'et-sp-2', name: 'Maria Hoffmann 教授', avatar: '', bio: '柏林自由大学', expertise: '兽医生物力学' },
        ],
      },
    },
  },

  // ──── COMPLETED ────

  {
    slug: 'ecvim-2025',
    status: 'completed',
    startDate: '2025-10-09T08:00:00Z',
    endDate: '2025-10-11T18:00:00Z',
    coverImageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=80',
    venueImageUrl: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1200&q=80',
    sortOrder: 50,
    agenda: [
      {
        id: 'ecvim-grp-1',
        dayLabel: 'DAY 1 · Oct 9',
        groupTitle: 'Opening & V-CLAMP Symposium',
        items: [
          { id: 'ecvim-item-1', startTime: '09:00', endTime: '09:30', title: 'Welcome Address', desc: 'Opening remarks and introduction to the ECVIM 2025 programme.', speaker: 'Dr. Pierre Dupont · Congress Chair' },
          { id: 'ecvim-item-2', startTime: '09:30', endTime: '10:30', title: 'V-CLAMP European Clinical Results: First International Disclosure', desc: 'Presentation of multi-center clinical data from European partner hospitals — 84 cases across France, Germany, and Spain.', speaker: 'Dr. Klaus Weber · Tierklinik München' },
          { id: 'ecvim-item-3', startTime: '11:00', endTime: '12:30', title: 'Hongyu Medical Technical Symposium', desc: 'Deep-dive into V-CLAMP surgical technique, indications, and post-operative management protocols.', speaker: 'Multiple Hongyu Certified Surgeons' },
          { id: 'ecvim-item-4', startTime: '14:00', endTime: '17:00', title: 'Hands-On Workshop: V-CLAMP Application', desc: 'Supervised practical session on V-CLAMP device handling and placement simulation.', speaker: 'Platinum-Level Certified Surgeons' },
        ],
      },
      {
        id: 'ecvim-grp-2',
        dayLabel: 'DAY 2 · Oct 10',
        groupTitle: 'Cardiovascular Surgery & Case Presentations',
        items: [
          { id: 'ecvim-item-5', startTime: '09:00', endTime: '10:30', title: 'Advances in Small Animal Cardiovascular Surgery', desc: 'Overview of current techniques and emerging technologies in companion animal cardiovascular intervention.', speaker: 'Dr. Klaus Weber' },
          { id: 'ecvim-item-6', startTime: '10:45', endTime: '12:00', title: 'Complex Case Panel: V-CLAMP in Challenging Anatomies', desc: 'Panel discussion of 6 challenging surgical cases managed with V-CLAMP across European centers.', speaker: 'Multi-center Case Panel' },
          { id: 'ecvim-item-7', startTime: '14:00', endTime: '16:00', title: 'Internal Medicine & Surgical Interaction Symposium', desc: 'Collaborative session on pre- and post-operative medical management for cardiovascular surgery patients.', speaker: 'Dr. Pierre Dupont · DECVIM-CA' },
        ],
      },
      {
        id: 'ecvim-grp-3',
        dayLabel: 'DAY 3 · Oct 11',
        groupTitle: 'Closing Sessions & Networking',
        items: [
          { id: 'ecvim-item-8', startTime: '09:00', endTime: '10:30', title: 'Poster Presentations: European Clinical Data', desc: 'Peer-reviewed poster presentations from 8 European veterinary institutions.', speaker: 'Various Presenters' },
          { id: 'ecvim-item-9', startTime: '11:00', endTime: '12:00', title: 'Closing Keynote: Future of Veterinary Cardiovascular Care', desc: 'Forward-looking discussion on device innovation, AI-assisted surgery, and global collaboration in veterinary medicine.', speaker: 'Dr. Klaus Weber · Dr. Pierre Dupont' },
        ],
      },
    ],
    i18n: {
      en: {
        title: 'ECVIM 2025 European College of Veterinary Internal Medicine Congress',
        description: 'Hongyu Medical participated and hosted a dedicated V-CLAMP technical symposium attracting veterinarians from 15 countries, with 300+ total attendees. Clinical results from European partner centers were presented for the first time at an international congress.',
        scale: '300+ attendees from 15 countries',
        duration: '3 Days',
        location: 'Lyon, France',
        address: 'Centre de Congrès de Lyon, 50 quai Charles de Gaulle, Lyon',
        transportation: 'Tram T1 or T4 to Cité Internationale stop. 10 minutes from Lyon Part-Dieu railway station.',
        speakers: [
          { id: 'ecvim-sp-1', name: 'Dr. Pierre Dupont', avatar: '', bio: 'DECVIM-CA · École Nationale Vétérinaire de Lyon', expertise: 'Internal Medicine' },
          { id: 'ecvim-sp-2', name: 'Dr. Klaus Weber', avatar: '', bio: 'Dr.med.vet. · Tierklinik München', expertise: 'Cardiovascular Surgery' },
        ],
      },
      'zh-CN': {
        title: 'ECVIM 2025 欧洲兽医内科学大会',
        description: '竑宇医疗参展并举办 V-CLAMP 技术研讨会，吸引来自 15 个国家的兽医师参会，共计 300+ 人出席。欧洲合作中心的临床结果首次在国际会议上公开发布。',
        scale: '来自 15 国的 300+ 参会',
        duration: '3 天',
        location: '法国 · 里昂',
        address: 'Centre de Congrès de Lyon, 50 quai Charles de Gaulle, Lyon',
        transportation: '乘 T1 或 T4 路有轨电车至 Cité Internationale 站，距里昂 Part-Dieu 火车站约 10 分钟。',
        speakers: [
          { id: 'ecvim-sp-1', name: 'Pierre Dupont 博士', avatar: '', bio: 'DECVIM-CA · 里昂国立兽医学院', expertise: '内科学' },
          { id: 'ecvim-sp-2', name: 'Klaus Weber 博士', avatar: '', bio: 'Dr.med.vet. · 慕尼黑动物诊所', expertise: '心血管外科' },
        ],
      },
    },
  },

  {
    slug: 'hongyu-summit-2025',
    status: 'completed',
    startDate: '2025-08-14T08:00:00Z',
    endDate: '2025-08-15T18:00:00Z',
    coverImageUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1200&q=80',
    venueImageUrl: 'https://images.unsplash.com/photo-1570126618953-d437176e8c79?w=1200&q=80',
    sortOrder: 60,
    agenda: [
      {
        id: 'hs25-grp-1',
        dayLabel: 'DAY 1 · Aug 14',
        groupTitle: 'Opening Ceremony & Clinical Data Sharing',
        items: [
          { id: 'hs25-item-1', startTime: '09:00', endTime: '09:30', title: 'Opening Address & Company Milestones', desc: 'Hongyu Medical CEO reviews the company\'s 2025 milestones: 50+ global certified surgeons, V-CLAMP approved in 4 new markets.', speaker: 'Wang XX · CEO' },
          { id: 'hs25-item-2', startTime: '09:30', endTime: '10:30', title: 'V-CLAMP 2025 Global Clinical Review', desc: 'Comprehensive review of 2025 V-CLAMP clinical outcomes: 180+ procedures across Asia-Pacific and Europe, with 98.2% procedural success rate.', speaker: 'Dr. Zhang Mingyuan · Chief Surgeon' },
          { id: 'hs25-item-3', startTime: '10:45', endTime: '12:00', title: 'Sports Medicine Product: 12-Month Real-World Data', desc: 'First-year real-world clinical data from 8 partner centers for the arthroscopic anchor system.', speaker: 'Dr. Wang Xuefeng · Oncological Surgery' },
          { id: 'hs25-item-4', startTime: '14:00', endTime: '15:30', title: 'International Surgeons Round Table', desc: 'Certified surgeons from China, Japan, and Germany share clinical insights, technique variations, and patient outcomes.', speaker: 'Dr. Kenji Tanaka · Dr. Klaus Weber' },
          { id: 'hs25-item-5', startTime: '15:45', endTime: '17:00', title: 'Hands-On Workshop: V-CLAMP Technique Refresher', desc: 'Practical refresher session for certified surgeons on updated V-CLAMP application protocols.', speaker: 'Platinum-Level Certified Surgeons' },
        ],
      },
      {
        id: 'hs25-grp-2',
        dayLabel: 'DAY 2 · Aug 15',
        groupTitle: 'Product Roadmap & Certification Ceremony',
        items: [
          { id: 'hs25-item-6', startTime: '09:00', endTime: '10:00', title: '2026 Product Pipeline Preview', desc: 'Sneak peek at upcoming products including the cardiac pacemaker, next-gen V-CLAMP, and AI-assisted surgical guidance system.', speaker: 'Li XX · CTO' },
          { id: 'hs25-item-7', startTime: '10:15', endTime: '11:30', title: 'Certification Program Updates & Training Roadmap', desc: 'Introduction of the new Platinum-level certification criteria, annual training schedule, and global surgical mentorship program.', speaker: 'Hongyu Medical Education Team' },
          { id: 'hs25-item-8', startTime: '14:00', endTime: '15:00', title: 'Partner Center Showcase', desc: 'Representatives from 6 partner centers present their annual clinical case summaries and center development highlights.', speaker: 'Partner Center Representatives' },
          { id: 'hs25-item-9', startTime: '15:15', endTime: '16:30', title: 'Annual Certified Surgeon Awards & Closing Ceremony', desc: 'Recognition of outstanding surgeons, presentation of Platinum certifications, and closing remarks.', speaker: 'Wang XX · CEO' },
        ],
      },
    ],
    i18n: {
      en: {
        title: 'Hongyu Medical Annual Academic Summit 2025',
        description: 'Hongyu Medical\'s inaugural annual academic summit, bringing together 50+ certified surgeons from around the world to share V-CLAMP clinical data and sports medicine application experiences. 200+ attendees across 2 days of intensive knowledge exchange.',
        scale: '200+ attendees, 50+ certified surgeons',
        duration: '2 Days',
        location: 'Shanghai, China',
        address: 'Shanghai World Expo Exhibition & Convention Center, 850 Bocheng Road, Pudong New Area, Shanghai',
        transportation: 'Metro Line 8 to Expo Avenue Station, 5-minute walk to the convention center main entrance.',
        speakers: [
          { id: 'hs25-sp-1', name: 'Dr. Zhang Mingyuan', avatar: '', bio: 'Chief Surgeon · Beijing Companion Animal Center Hospital', expertise: 'V-CLAMP Clinical' },
          { id: 'hs25-sp-2', name: 'Dr. Wang Xuefeng', avatar: '', bio: 'Chief Surgeon · China Agricultural University Animal Hospital', expertise: 'Oncological Surgery' },
          { id: 'hs25-sp-3', name: 'Dr. Kenji Tanaka', avatar: '', bio: 'Veterinary Ph.D. · Tokyo Small Animal Medical Center', expertise: 'Sports Medicine' },
        ],
      },
      'zh-CN': {
        title: '竑宇医疗年度学术大会 2025',
        description: '汇聚全球 50+ 认证术者，分享 V-CLAMP 最新临床数据与运动医学产品应用经验，共计 200+ 人参会，历时 2 天的深度学术交流。',
        scale: '200+ 参会，50+ 认证术者',
        duration: '2 天',
        location: '中国 · 上海',
        address: '上海浦东新区博城路 850 号 上海世博展览馆',
        transportation: '地铁 8 号线世博大道站，步行 5 分钟至展览馆主入口。',
        speakers: [
          { id: 'hs25-sp-1', name: '张明远', avatar: '', bio: '主任医师 · 北京伴侣动物中心医院', expertise: 'V-CLAMP 临床' },
          { id: 'hs25-sp-2', name: '王雪峰', avatar: '', bio: '主任医师 · 中国农业大学动物医院', expertise: '肿瘤外科' },
          { id: 'hs25-sp-3', name: '田中健太', avatar: '', bio: '兽医学博士 · 东京小动物医疗中心', expertise: '运动医学' },
        ],
      },
    },
  },
];

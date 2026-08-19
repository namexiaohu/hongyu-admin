export type SurgeonSeedRecord = {
  slug: string;
  gradeKey: 'platinum' | 'gold' | 'silver';
  sortOrder: number;
  avatarUrl: string;
  i18n: Record<string, {
    name: string;
    position: string;
    institution: string;
    expertise: string;
    experience: string;
    gradeTitle: string;
    tags: string[];
  }>;
};

export const SURGEON_SEED_RECORDS: SurgeonSeedRecord[] = [
  {
    slug: 'zhang-mingyuan',
    gradeKey: 'platinum',
    sortOrder: 10,
    avatarUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=face',
    i18n: {
      'zh-CN': { name: '张明远', position: '主任医师 · 博士', institution: '北京伴侣动物中心医院', expertise: '外科 · 腹腔手术', experience: '认证年份：2019 · 手术量 3,200+', gradeTitle: '铂金级术者', tags: ['V-CLAMP', '脾脏切除', '肝叶切除'] },
      en: { name: 'Mingyuan Zhang', position: 'Chief Veterinarian, PhD', institution: 'Beijing Companion Animal Hospital', expertise: 'Surgery · Abdominal', experience: 'Certified 2019 · 3,200+ cases', gradeTitle: 'Platinum Surgeon', tags: ['V-CLAMP', 'Splenectomy', 'Liver Lobectomy'] },
    },
  },
  {
    slug: 'sarah-mitchell',
    gradeKey: 'gold',
    sortOrder: 20,
    avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&crop=face',
    i18n: {
      'zh-CN': { name: 'Sarah Mitchell', position: 'DVM, DACVS', institution: 'Cornell 兽医院（美国）', expertise: '软组织外科', experience: '认证年份：2020 · 手术量 2,800+', gradeTitle: '金级术者', tags: ['V-CLAMP', '脾脏切除'] },
      en: { name: 'Sarah Mitchell', position: 'DVM, DACVS', institution: 'Cornell Veterinary Hospital, USA', expertise: 'Soft Tissue Surgery', experience: 'Certified 2020 · 2,800+ cases', gradeTitle: 'Gold Surgeon', tags: ['V-CLAMP', 'Splenectomy'] },
    },
  },
  {
    slug: 'tanaka-kenta',
    gradeKey: 'gold',
    sortOrder: 30,
    avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&h=200&fit=crop&crop=face',
    i18n: {
      'zh-CN': { name: '田中健太', position: '兽医学博士', institution: '东京小动物医疗中心', expertise: '运动医学 · 骨科', experience: '认证年份：2021 · 手术量 1,500+', gradeTitle: '金级术者', tags: ['V-CLAMP', '关节镜', '韧带修复'] },
      en: { name: 'Kenta Tanaka', position: 'DVM, PhD', institution: 'Tokyo Small Animal Medical Center', expertise: 'Sports Medicine · Orthopedics', experience: 'Certified 2021 · 1,500+ cases', gradeTitle: 'Gold Surgeon', tags: ['V-CLAMP', 'Arthroscopy', 'Ligament Repair'] },
    },
  },
  {
    slug: 'li-minghua',
    gradeKey: 'silver',
    sortOrder: 40,
    avatarUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200&h=200&fit=crop&crop=face',
    i18n: {
      'zh-CN': { name: '李明华', position: '副主任医师', institution: '上海宠颐生动物医院', expertise: '外科 · 软组织', experience: '认证年份：2022 · 手术量 980+', gradeTitle: '银级术者', tags: ['V-CLAMP', '子宫卵巢摘除'] },
      en: { name: 'Minghua Li', position: 'Associate Chief Veterinarian', institution: 'Shanghai Pet Care Animal Hospital', expertise: 'Surgery · Soft Tissue', experience: 'Certified 2022 · 980+ cases', gradeTitle: 'Silver Surgeon', tags: ['V-CLAMP', 'Ovariohysterectomy'] },
    },
  },
  {
    slug: 'klaus-weber',
    gradeKey: 'platinum',
    sortOrder: 50,
    avatarUrl: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=200&h=200&fit=crop&crop=face',
    i18n: {
      'zh-CN': { name: 'Klaus Weber 博士', position: 'Dr.med.vet., DECVS', institution: '慕尼黑动物诊所（德国）', expertise: '心血管外科', experience: '认证年份：2021 · 手术量 1,200+', gradeTitle: '铂金级术者', tags: ['V-CLAMP', '心脏手术'] },
      en: { name: 'Dr. Klaus Weber', position: 'Dr.med.vet., DECVS', institution: 'Tierklinik München, Germany', expertise: 'Cardiovascular Surgery', experience: 'Certified 2021 · 1,200+ cases', gradeTitle: 'Platinum Surgeon', tags: ['V-CLAMP', 'Cardiac'] },
    },
  },
  {
    slug: 'wang-xuefeng',
    gradeKey: 'platinum',
    sortOrder: 60,
    avatarUrl: 'https://images.unsplash.com/photo-1618498082410-b4aa22193b38?w=200&h=200&fit=crop&crop=face',
    i18n: {
      'zh-CN': { name: '王雪峰', position: '主任医师 · 教授', institution: '中国农业大学动物医院', expertise: '外科 · 肿瘤外科', experience: '认证年份：2018 · 手术量 4,100+', gradeTitle: '铂金级术者', tags: ['V-CLAMP', '肿瘤切除', '脾脏切除'] },
      en: { name: 'Xuefeng Wang', position: 'Chief Veterinarian, Professor', institution: 'China Agricultural University Animal Hospital', expertise: 'Surgery · Oncological', experience: 'Certified 2018 · 4,100+ cases', gradeTitle: 'Platinum Surgeon', tags: ['V-CLAMP', 'Tumor Resection', 'Splenectomy'] },
    },
  },
  {
    slug: 'emma-rodriguez',
    gradeKey: 'gold',
    sortOrder: 70,
    avatarUrl: 'https://images.unsplash.com/photo-1607990283143-e81e7a2c9349?w=200&h=200&fit=crop&crop=face',
    i18n: {
      'zh-CN': { name: 'Emma Rodríguez', position: 'DVM, 外科专科', institution: '马德里兽医大学附属医院（西班牙）', expertise: '泌尿外科', experience: '认证年份：2022 · 手术量 750+', gradeTitle: '金级术者', tags: ['V-CLAMP', '膀胱切开术'] },
      en: { name: 'Emma Rodríguez', position: 'DVM, Surgical Specialist', institution: 'Madrid Veterinary University Hospital, Spain', expertise: 'Urological Surgery', experience: 'Certified 2022 · 750+ cases', gradeTitle: 'Gold Surgeon', tags: ['V-CLAMP', 'Cystotomy'] },
    },
  },
  {
    slug: 'chen-weijun',
    gradeKey: 'silver',
    sortOrder: 80,
    avatarUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=face',
    i18n: {
      'zh-CN': { name: '陈伟军', position: '主治医师', institution: '广州瑞派宠物医院', expertise: '普外科 · 急诊', experience: '认证年份：2023 · 手术量 520+', gradeTitle: '银级术者', tags: ['V-CLAMP', '肠切除吻合'] },
      en: { name: 'Weijun Chen', position: 'Attending Veterinarian', institution: 'Guangzhou Ruipai Pet Hospital', expertise: 'General Surgery · Emergency', experience: 'Certified 2023 · 520+ cases', gradeTitle: 'Silver Surgeon', tags: ['V-CLAMP', 'Intestinal Resection'] },
    },
  },
];

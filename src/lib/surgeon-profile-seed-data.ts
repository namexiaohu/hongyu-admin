export type SurgeonProfileSeedLocale = {
  detailDescription: string;
  otherCertifications: Array<{ label: string; value: string }>;
  specialties: string[];
};

export type SurgeonProfileSeedRecord = {
  slug: string;
  certificationYear: number;
  surgeryCount: number;
  i18n: Record<string, SurgeonProfileSeedLocale>;
};

export const SURGEON_PROFILE_SEED_RECORDS: SurgeonProfileSeedRecord[] = [
  {
    slug: 'zhang-mingyuan',
    certificationYear: 2019,
    surgeryCount: 3200,
    i18n: {
      'zh-CN': {
        detailDescription: `<p>张明远，兽医学博士，主任医师，现任北京伴侣动物中心医院外科主任。2008 年毕业于中国农业大学兽医学院，获兽医学博士学位。从事小动物外科手术临床工作 15 年，累计完成各类外科手术超过 3,200 例。</p>
<p>张医生是国内首批通过竑宇医疗 V-CLAMP 认证培训的兽医师之一，2019 年完成认证培训并获得铂金级术者资质。在 V-CLAMP 血管闭合系统的临床应用方面积累了丰富经验，参与多项多中心临床研究，是该产品的核心临床顾问。</p>
<h3>专业领域</h3>
<ul>
<li>小动物普通外科手术（脾脏切除、甲状腺切除、子宫卵巢摘除等）</li>
<li>肿瘤外科手术（浅表肿瘤切除、腹腔肿瘤切除）</li>
<li>急诊创伤性出血快速止血</li>
<li>V-CLAMP 血管闭合系统临床培训与带教</li>
</ul>
<h3>学术成果</h3>
<p>张医生在国内外兽医学期刊发表论文 20 余篇，其中与竑宇医疗合作的 V-CLAMP 相关临床研究论文 12 篇。多次受邀在国内兽医学术大会上进行 V-CLAMP 临床应用经验分享。</p>`,
        otherCertifications: [{ label: '认证产品', value: 'V-CLAMP' }],
        specialties: ['普通外科', '肿瘤外科', '急诊外科'],
      },
      en: {
        detailDescription: `<p>Mingyuan Zhang, DVM, PhD, is Chief of Surgery at Beijing Companion Animal Hospital. He earned his doctorate from China Agricultural University College of Veterinary Medicine in 2008 and has practiced small-animal surgery for 15 years, completing more than 3,200 procedures.</p>
<p>He was among the first veterinarians in China to complete Hongyu Medical V-CLAMP certification training in 2019 and holds Platinum Surgeon status. He is a core clinical advisor for V-CLAMP and has contributed to multi-center clinical studies on vessel sealing.</p>
<h3>Clinical Focus</h3>
<ul>
<li>General soft-tissue surgery (splenectomy, thyroidectomy, ovariohysterectomy)</li>
<li>Oncologic surgery (superficial and abdominal tumor resection)</li>
<li>Rapid hemorrhage control in emergency trauma</li>
<li>V-CLAMP clinical training and preceptorship</li>
</ul>
<h3>Academic Work</h3>
<p>Dr. Zhang has published more than 20 peer-reviewed papers, including 12 V-CLAMP clinical studies in collaboration with Hongyu Medical, and regularly presents at national veterinary congresses.</p>`,
        otherCertifications: [{ label: 'Certified Product', value: 'V-CLAMP' }],
        specialties: ['General Surgery', 'Oncologic Surgery', 'Emergency Surgery'],
      },
    },
  },
  {
    slug: 'sarah-mitchell',
    certificationYear: 2020,
    surgeryCount: 2800,
    i18n: {
      'zh-CN': {
        detailDescription: `<p>Sarah Mitchell，DVM、DACVS，现任康奈尔大学兽医院软组织外科专科医师。长期专注犬猫软组织外科与微创血管闭合技术，累计完成手术约 2,800 例。</p>
<p>2020 年完成竑宇医疗 V-CLAMP 认证并获金级术者资质，在脾脏切除等腹腔软组织手术中系统应用智能压力反馈闭合技术，并参与北美地区的临床培训工作。</p>
<h3>专业领域</h3>
<ul>
<li>犬猫软组织外科</li>
<li>脾脏切除与腹腔止血</li>
<li>微创辅助血管闭合</li>
</ul>`,
        otherCertifications: [{ label: '认证产品', value: 'V-CLAMP' }],
        specialties: ['软组织外科', '腹腔外科'],
      },
      en: {
        detailDescription: `<p>Sarah Mitchell, DVM, DACVS, is a soft-tissue surgery specialist at Cornell University Veterinary Hospital. She focuses on canine and feline soft-tissue procedures and vessel-sealing techniques, with about 2,800 cases completed.</p>
<p>She earned Hongyu Medical V-CLAMP Gold Surgeon certification in 2020 and applies pressure-feedback sealing extensively in abdominal soft-tissue surgery, including splenectomy training programs in North America.</p>
<h3>Clinical Focus</h3>
<ul>
<li>Canine and feline soft-tissue surgery</li>
<li>Splenectomy and abdominal hemostasis</li>
<li>Minimally assisted vessel sealing</li>
</ul>`,
        otherCertifications: [{ label: 'Certified Product', value: 'V-CLAMP' }],
        specialties: ['Soft Tissue Surgery', 'Abdominal Surgery'],
      },
    },
  },
  {
    slug: 'tanaka-kenta',
    certificationYear: 2021,
    surgeryCount: 1500,
    i18n: {
      'zh-CN': {
        detailDescription: `<p>田中健太，兽医学博士，东京小动物医疗中心运动医学与骨科主治医师。擅长关节镜、韧带修复及术中止血管理，累计手术约 1,500 例。</p>
<p>2021 年完成 V-CLAMP 金级认证，将血管闭合系统应用于骨科相关软组织剥离与出血控制，并参与日本地区术者工作坊教学。</p>
<h3>专业领域</h3>
<ul>
<li>关节镜与韧带修复</li>
<li>运动医学相关软组织处理</li>
<li>术中出血控制与血管闭合</li>
</ul>`,
        otherCertifications: [{ label: '认证产品', value: 'V-CLAMP' }],
        specialties: ['运动医学', '骨科', '关节镜'],
      },
      en: {
        detailDescription: `<p>Kenta Tanaka, DVM, PhD, practices sports medicine and orthopedics at Tokyo Small Animal Medical Center. He specializes in arthroscopy, ligament repair, and intraoperative hemostasis, with about 1,500 procedures completed.</p>
<p>Certified as a V-CLAMP Gold Surgeon in 2021, he uses vessel sealing during orthopedic soft-tissue dissection and teaches workshops for Japanese clinicians.</p>
<h3>Clinical Focus</h3>
<ul>
<li>Arthroscopy and ligament repair</li>
<li>Sports-medicine soft-tissue management</li>
<li>Intraoperative hemorrhage control with vessel sealing</li>
</ul>`,
        otherCertifications: [{ label: 'Certified Product', value: 'V-CLAMP' }],
        specialties: ['Sports Medicine', 'Orthopedics', 'Arthroscopy'],
      },
    },
  },
  {
    slug: 'li-minghua',
    certificationYear: 2022,
    surgeryCount: 980,
    i18n: {
      'zh-CN': {
        detailDescription: `<p>李明华，副主任医师，上海宠颐生动物医院外科骨干。专注软组织外科与繁殖相关手术，累计完成手术约 980 例。</p>
<p>2022 年通过竑宇医疗银级认证，在子宫卵巢摘除等常规手术中规范使用 V-CLAMP，缩短手术时间并降低结扎相关并发症风险。</p>
<h3>专业领域</h3>
<ul>
<li>软组织外科</li>
<li>子宫卵巢摘除</li>
<li>常规腹腔止血</li>
</ul>`,
        otherCertifications: [{ label: '认证产品', value: 'V-CLAMP' }],
        specialties: ['软组织外科', '繁殖外科'],
      },
      en: {
        detailDescription: `<p>Minghua Li is an associate chief veterinarian at Shanghai Pet Care Animal Hospital, focusing on soft-tissue and reproductive surgery with about 980 cases completed.</p>
<p>He obtained Hongyu Medical Silver Surgeon certification in 2022 and routinely applies V-CLAMP in ovariohysterectomy to shorten operative time and reduce ligation-related complications.</p>
<h3>Clinical Focus</h3>
<ul>
<li>Soft-tissue surgery</li>
<li>Ovariohysterectomy</li>
<li>Standard abdominal hemostasis</li>
</ul>`,
        otherCertifications: [{ label: 'Certified Product', value: 'V-CLAMP' }],
        specialties: ['Soft Tissue Surgery', 'Reproductive Surgery'],
      },
    },
  },
  {
    slug: 'klaus-weber',
    certificationYear: 2021,
    surgeryCount: 1200,
    i18n: {
      'zh-CN': {
        detailDescription: `<p>Klaus Weber 博士，Dr.med.vet.、DECVS，慕尼黑动物诊所心血管外科专科医师。长期从事心血管与胸腔相关手术，累计案例约 1,200 例。</p>
<p>2021 年获得 V-CLAMP 铂金级认证，在心脏与大血管周边软组织处理中应用压力反馈闭合技术，并参与欧洲地区临床顾问工作。</p>
<h3>专业领域</h3>
<ul>
<li>心血管外科</li>
<li>胸腔软组织止血</li>
<li>复杂病例术中血管闭合</li>
</ul>`,
        otherCertifications: [{ label: '认证产品', value: 'V-CLAMP' }],
        specialties: ['心血管外科', '胸外科'],
      },
      en: {
        detailDescription: `<p>Dr. Klaus Weber, Dr.med.vet., DECVS, is a cardiovascular surgery specialist at Tierklinik München, Germany, with about 1,200 cardiovascular and thoracic soft-tissue cases.</p>
<p>He received V-CLAMP Platinum Surgeon certification in 2021 and applies pressure-feedback sealing around cardiac and great-vessel soft tissues while advising European clinical programs.</p>
<h3>Clinical Focus</h3>
<ul>
<li>Cardiovascular surgery</li>
<li>Thoracic soft-tissue hemostasis</li>
<li>Complex intraoperative vessel sealing</li>
</ul>`,
        otherCertifications: [{ label: 'Certified Product', value: 'V-CLAMP' }],
        specialties: ['Cardiovascular Surgery', 'Thoracic Surgery'],
      },
    },
  },
  {
    slug: 'wang-xuefeng',
    certificationYear: 2018,
    surgeryCount: 4100,
    i18n: {
      'zh-CN': {
        detailDescription: `<p>王雪峰，主任医师、教授，中国农业大学动物医院外科与肿瘤外科负责人。从事小动物外科临床与教学 20 余年，累计手术超过 4,100 例。</p>
<p>2018 年完成 V-CLAMP 铂金级认证，是国内最早一批将该系统引入教学医院的术者之一，长期承担多中心临床研究与青年医师带教。</p>
<h3>专业领域</h3>
<ul>
<li>肿瘤外科与腹腔肿瘤切除</li>
<li>脾脏切除等大血管相关手术</li>
<li>临床教学与术者培训</li>
</ul>`,
        otherCertifications: [
          { label: '认证产品', value: 'V-CLAMP' },
          { label: '教学医院', value: '中国农业大学动物医院' },
        ],
        specialties: ['肿瘤外科', '普通外科', '教学培训'],
      },
      en: {
        detailDescription: `<p>Xuefeng Wang, Chief Veterinarian and Professor, leads surgery and oncologic surgery at China Agricultural University Animal Hospital. With more than 20 years of clinical and teaching experience, he has completed over 4,100 procedures.</p>
<p>He completed V-CLAMP Platinum certification in 2018 as one of the earliest adopters in a Chinese teaching hospital, and continues multi-center research plus training for junior surgeons.</p>
<h3>Clinical Focus</h3>
<ul>
<li>Oncologic and abdominal tumor resection</li>
<li>Splenectomy and major vessel-related procedures</li>
<li>Clinical teaching and surgeon training</li>
</ul>`,
        otherCertifications: [
          { label: 'Certified Product', value: 'V-CLAMP' },
          { label: 'Teaching Hospital', value: 'CAU Animal Hospital' },
        ],
        specialties: ['Oncologic Surgery', 'General Surgery', 'Training'],
      },
    },
  },
  {
    slug: 'emma-rodriguez',
    certificationYear: 2022,
    surgeryCount: 750,
    i18n: {
      'zh-CN': {
        detailDescription: `<p>Emma Rodríguez，DVM，马德里兽医大学附属医院泌尿外科专科医师。专注膀胱切开、尿道相关手术及术中止血，累计手术约 750 例。</p>
<p>2022 年获得 V-CLAMP 金级认证，在泌尿外科开放手术中应用血管闭合系统，减少结扎步骤并缩短麻醉时间。</p>
<h3>专业领域</h3>
<ul>
<li>泌尿外科</li>
<li>膀胱切开术</li>
<li>盆腔软组织止血</li>
</ul>`,
        otherCertifications: [{ label: '认证产品', value: 'V-CLAMP' }],
        specialties: ['泌尿外科', '软组织外科'],
      },
      en: {
        detailDescription: `<p>Emma Rodríguez, DVM, is a urologic surgery specialist at Madrid Veterinary University Hospital, focusing on cystotomy, urethral procedures, and intraoperative hemostasis with about 750 cases.</p>
<p>She earned V-CLAMP Gold Surgeon certification in 2022 and uses vessel sealing in open urologic procedures to reduce ligation steps and anesthesia time.</p>
<h3>Clinical Focus</h3>
<ul>
<li>Urologic surgery</li>
<li>Cystotomy</li>
<li>Pelvic soft-tissue hemostasis</li>
</ul>`,
        otherCertifications: [{ label: 'Certified Product', value: 'V-CLAMP' }],
        specialties: ['Urologic Surgery', 'Soft Tissue Surgery'],
      },
    },
  },
  {
    slug: 'chen-weijun',
    certificationYear: 2023,
    surgeryCount: 520,
    i18n: {
      'zh-CN': {
        detailDescription: `<p>陈伟军，主治医师，广州瑞派宠物医院普外科与急诊外科医师。擅长肠切除吻合及急诊止血相关手术，累计完成约 520 例。</p>
<p>2023 年通过 V-CLAMP 银级认证，在急诊开腹与肠管手术中应用血管闭合技术，提升术中出血控制效率。</p>
<h3>专业领域</h3>
<ul>
<li>普外科与肠切除吻合</li>
<li>急诊开腹止血</li>
<li>软组织创伤处理</li>
</ul>`,
        otherCertifications: [{ label: '认证产品', value: 'V-CLAMP' }],
        specialties: ['普外科', '急诊外科'],
      },
      en: {
        detailDescription: `<p>Weijun Chen is an attending veterinarian in general and emergency surgery at Guangzhou Ruipai Pet Hospital, with about 520 intestinal resection/anastomosis and emergency hemostasis cases.</p>
<p>He obtained V-CLAMP Silver Surgeon certification in 2023 and applies vessel sealing in emergency laparotomy and intestinal surgery to improve hemorrhage control.</p>
<h3>Clinical Focus</h3>
<ul>
<li>General surgery and intestinal resection/anastomosis</li>
<li>Emergency laparotomy hemostasis</li>
<li>Soft-tissue trauma management</li>
</ul>`,
        otherCertifications: [{ label: 'Certified Product', value: 'V-CLAMP' }],
        specialties: ['General Surgery', 'Emergency Surgery'],
      },
    },
  },
];

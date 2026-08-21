export type PartnerCenterProfileLocale = {
  badgeText?: string;
  address?: string;
  detailDescription: string;
  stats: Array<{ label: string; value: string }>;
  cooperationInfo: Array<{ label: string; value: string }>;
};

export type PartnerCenterProfileSeedRecord = {
  slug: string;
  email: string;
  website?: string;
  backgroundUrl: string;
  i18n: Record<string, PartnerCenterProfileLocale>;
};

export const PARTNER_CENTER_PROFILE_SEED_RECORDS: PartnerCenterProfileSeedRecord[] = [
  {
    slug: 'beijing-companion-animal-hospital',
    email: 'info@bj-companion-vet.com',
    website: 'https://www.bjpetvet.com',
    backgroundUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&h=900&fit=crop',
    i18n: {
      en: {
        badgeText: 'Clinical Partner · Training Base',
        address: '88 Jianguo Road, Chaoyang District, Beijing',
        detailDescription: `<p>Beijing Companion Animal Hospital was founded in 2010 and is one of the leading comprehensive companion-animal hospitals in North China. The hospital operates 12 clinical departments—including surgery, internal medicine, imaging, and laboratory medicine—with more than 40 licensed veterinarians and over 30,000 visits each year.</p>
<p>Since 2018, the hospital has partnered with Hongyu Medical as a core clinical training base for the V-CLAMP vessel-sealing system. The surgical team has completed more than 8,500 V-CLAMP-related procedures and remains one of the most experienced V-CLAMP centers in China.</p>
<h3>Partnership Scope</h3>
<ul>
<li>V-CLAMP clinical training and preceptorship</li>
<li>Preclinical research and clinical trials for new products</li>
<li>Joint publications and clinical datasets</li>
<li>Certified surgeon assessment</li>
<li>Hosting of Hongyu annual academic meetings</li>
</ul>
<h3>Credentials</h3>
<p>The hospital is ISO 9001 certified, holds GLP animal clinical trial qualification, and is a designated animal disease diagnosis facility under China’s Ministry of Agriculture and Rural Affairs.</p>`,
        stats: [
          { label: 'Certified Surgeons', value: '6' },
          { label: 'Joint Papers', value: '15' },
          { label: 'Partnership Since', value: '2018' },
          { label: 'Cumulative Cases', value: '8,500+' },
        ],
        cooperationInfo: [
          { label: 'Partnership Type', value: 'Clinical Partner · Training Base' },
          { label: 'Start Year', value: '2018' },
          { label: 'Products', value: 'V-CLAMP Full Line' },
        ],
      },
      'zh-CN': {
        badgeText: '临床合作 · 培训基地',
        address: '北京市朝阳区建国路 88 号',
        detailDescription: `<p>北京伴侣动物中心医院成立于 2010 年，是华北地区规模领先的综合性动物医院之一。医院设有外科、内科、影像科、检验科等 12 个临床科室，拥有 40 余名执业兽医师，年接诊量超过 30,000 例。</p>
<p>自 2018 年起，北京伴侣动物中心医院与竑宇医疗建立临床合作关系，成为 V-CLAMP 血管闭合系统的核心临床培训基地。医院外科团队累计完成 V-CLAMP 相关手术超过 8,500 例，是国内 V-CLAMP 临床应用经验最丰富的中心之一。</p>
<h3>合作内容</h3>
<ul>
<li>V-CLAMP 血管闭合系统临床培训与带教</li>
<li>新产品临床前研究与临床试验</li>
<li>联合发表学术论文与临床数据</li>
<li>认证术者培训考核</li>
<li>竑宇医疗年度学术大会承办</li>
</ul>
<h3>医院资质</h3>
<p>医院通过 ISO 9001 质量管理体系认证，具备动物临床试验资质（GLP），是农业农村部指定的动物疫病诊疗机构。</p>`,
        stats: [
          { label: '认证术者', value: '6' },
          { label: '联合论文', value: '15' },
          { label: '合作起始年份', value: '2018' },
          { label: '累计手术案例', value: '8,500+' },
        ],
        cooperationInfo: [
          { label: '合作类型', value: '临床合作 · 培训基地' },
          { label: '合作起始', value: '2018 年' },
          { label: '合作产品', value: 'V-CLAMP 全系' },
        ],
      },
    },
  },
  {
    slug: 'china-agricultural-university-animal-hospital',
    email: 'hospital@cau.edu.cn',
    website: 'https://cau.edu.cn',
    backgroundUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?w=1600&h=900&fit=crop',
    i18n: {
      en: {
        detailDescription: `<p>China Agricultural University Animal Hospital is a national key-discipline teaching hospital supporting advanced small-animal surgery, oncology, and clinical research. Faculty clinicians combine high case volume with structured residency training.</p>
<p>As a Hongyu research partner, the hospital leads multi-center V-CLAMP clinical evaluations and academic publications, while mentoring certified surgeons for northern China.</p>
<h3>Partnership Scope</h3>
<ul>
<li>Multi-center clinical trials and protocol design</li>
<li>Academic publication collaboration</li>
<li>Resident and specialist training on vessel sealing</li>
<li>Oncology and abdominal surgery case registries</li>
</ul>`,
        stats: [
          { label: 'Certified Surgeons', value: '8' },
          { label: 'Joint Papers', value: '22' },
          { label: 'Partnership Since', value: '2017' },
          { label: 'Cumulative Cases', value: '12,000+' },
        ],
        cooperationInfo: [
          { label: 'Partnership Type', value: 'Research Center' },
          { label: 'Start Year', value: '2017' },
          { label: 'Products', value: 'V-CLAMP · Clinical Research' },
        ],
      },
      'zh-CN': {
        detailDescription: `<p>中国农业大学动物医院是国家重点学科依托教学医院，在小动物外科、肿瘤外科与临床研究方面具有深厚积累，并承担住院医师规范化培训。</p>
<p>作为竑宇医疗研究合作中心，医院牵头多项 V-CLAMP 多中心临床评价与学术发表，并为华北地区认证术者提供带教。</p>
<h3>合作内容</h3>
<ul>
<li>多中心临床试验与方案设计</li>
<li>联合学术发表</li>
<li>血管闭合相关住院医师与专科培训</li>
<li>肿瘤与腹腔手术病例登记</li>
</ul>`,
        stats: [
          { label: '认证术者', value: '8' },
          { label: '联合论文', value: '22' },
          { label: '合作起始年份', value: '2017' },
          { label: '累计手术案例', value: '12,000+' },
        ],
        cooperationInfo: [
          { label: '合作类型', value: '研究中心' },
          { label: '合作起始', value: '2017 年' },
          { label: '合作产品', value: 'V-CLAMP · 临床研究' },
        ],
      },
    },
  },
  {
    slug: 'tokyo-small-animal-medical-center',
    email: 'info@tosamc.jp',
    website: 'https://www.tosamc.jp',
    backgroundUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1600&h=900&fit=crop',
    i18n: {
      en: {
        detailDescription: `<p>Tokyo Small Animal Medical Center is a high-volume referral hospital specializing in soft-tissue surgery, orthopedics, and sports medicine. It serves as Hongyu’s designated Asia-Pacific training base for certified surgeons.</p>
<p>The center runs structured wet labs and preceptorship programs for V-CLAMP, combining Japanese surgical standards with regional clinical exchange.</p>
<h3>Partnership Scope</h3>
<ul>
<li>Certified surgeon workshops for Asia-Pacific</li>
<li>Orthopedic and soft-tissue vessel-sealing protocols</li>
<li>Regional case conferences and skill assessment</li>
</ul>`,
        stats: [
          { label: 'Certified Surgeons', value: '5' },
          { label: 'Training Sessions / Year', value: '18' },
          { label: 'Partnership Since', value: '2019' },
          { label: 'Cumulative Cases', value: '4,200+' },
        ],
        cooperationInfo: [
          { label: 'Partnership Type', value: 'Training Base' },
          { label: 'Start Year', value: '2019' },
          { label: 'Products', value: 'V-CLAMP' },
        ],
      },
      'zh-CN': {
        detailDescription: `<p>东京小动物医疗中心是专注软组织外科、骨科与运动医学的高流量转诊医院，也是竑宇亚太区认证术者指定培训基地。</p>
<p>中心定期举办 V-CLAMP 湿实验室与带教项目，结合日本手术规范开展区域临床交流。</p>
<h3>合作内容</h3>
<ul>
<li>亚太区认证术者工作坊</li>
<li>骨科与软组织血管闭合操作规范</li>
<li>区域病例讨论与技能考核</li>
</ul>`,
        stats: [
          { label: '认证术者', value: '5' },
          { label: '年培训场次', value: '18' },
          { label: '合作起始年份', value: '2019' },
          { label: '累计手术案例', value: '4,200+' },
        ],
        cooperationInfo: [
          { label: '合作类型', value: '培训基地' },
          { label: '合作起始', value: '2019 年' },
          { label: '合作产品', value: 'V-CLAMP' },
        ],
      },
    },
  },
  {
    slug: 'tierklinik-muenchen',
    email: 'kontakt@tierklinik-muenchen.de',
    website: 'https://www.tierklinik-muenchen.de',
    backgroundUrl: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1600&h=900&fit=crop',
    i18n: {
      en: {
        detailDescription: `<p>Tierklinik München is a leading German specialty hospital for advanced soft-tissue and cardiovascular surgery. It has served as a key European clinical validation site for Hongyu products during CE-related evaluations.</p>
<p>The team applies V-CLAMP across complex thoracic and abdominal cases and contributes structured outcome data to Hongyu’s European clinical network.</p>
<h3>Partnership Scope</h3>
<ul>
<li>CE-related clinical validation support</li>
<li>Cardiovascular and thoracic vessel sealing</li>
<li>European clinical advisory workshops</li>
</ul>`,
        stats: [
          { label: 'Certified Surgeons', value: '4' },
          { label: 'Joint Papers', value: '9' },
          { label: 'Partnership Since', value: '2020' },
          { label: 'Cumulative Cases', value: '1,800+' },
        ],
        cooperationInfo: [
          { label: 'Partnership Type', value: 'Clinical Partner' },
          { label: 'Start Year', value: '2020' },
          { label: 'Products', value: 'V-CLAMP' },
        ],
      },
      'zh-CN': {
        detailDescription: `<p>Tierklinik München 是德国领先的软组织与心血管专科动物医院，曾作为竑宇产品 CE 相关评价的关键欧洲临床验证基地。</p>
<p>团队在复杂胸腹手术中系统应用 V-CLAMP，并为欧洲临床网络提供结构化疗效数据。</p>
<h3>合作内容</h3>
<ul>
<li>CE 相关临床验证支持</li>
<li>心血管与胸腔血管闭合应用</li>
<li>欧洲临床顾问工作坊</li>
</ul>`,
        stats: [
          { label: '认证术者', value: '4' },
          { label: '联合论文', value: '9' },
          { label: '合作起始年份', value: '2020' },
          { label: '累计手术案例', value: '1,800+' },
        ],
        cooperationInfo: [
          { label: '合作类型', value: '临床合作' },
          { label: '合作起始', value: '2020 年' },
          { label: '合作产品', value: 'V-CLAMP' },
        ],
      },
    },
  },
  {
    slug: 'royal-veterinary-college',
    email: 'clinical@rvc.ac.uk',
    website: 'https://www.rvc.ac.uk',
    backgroundUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1600&h=900&fit=crop',
    i18n: {
      en: {
        detailDescription: `<p>The Royal Veterinary College partners with Hongyu on multi-center sports-medicine and soft-tissue studies. Clinicians integrate vessel-sealing techniques into referral surgery pathways and academic teaching clinics.</p>
<p>Collaboration focuses on protocolized outcome capture and trainee education for European specialty programs.</p>
<h3>Partnership Scope</h3>
<ul>
<li>Multi-center clinical trial participation</li>
<li>Sports medicine and soft-tissue research</li>
<li>Specialty trainee education</li>
</ul>`,
        stats: [
          { label: 'Certified Surgeons', value: '3' },
          { label: 'Active Studies', value: '4' },
          { label: 'Partnership Since', value: '2021' },
          { label: 'Cumulative Cases', value: '960+' },
        ],
        cooperationInfo: [
          { label: 'Partnership Type', value: 'Research Center' },
          { label: 'Start Year', value: '2021' },
          { label: 'Products', value: 'V-CLAMP · Sports Medicine' },
        ],
      },
      'zh-CN': {
        detailDescription: `<p>皇家兽医学院与竑宇合作开展多中心运动医学与软组织研究，将血管闭合技术纳入转诊手术路径与教学门诊。</p>
<p>合作重点包括规范化疗效采集，以及面向欧洲专科项目的学员培训。</p>
<h3>合作内容</h3>
<ul>
<li>多中心临床试验参与</li>
<li>运动医学与软组织研究</li>
<li>专科医师培训</li>
</ul>`,
        stats: [
          { label: '认证术者', value: '3' },
          { label: '在研项目', value: '4' },
          { label: '合作起始年份', value: '2021' },
          { label: '累计手术案例', value: '960+' },
        ],
        cooperationInfo: [
          { label: '合作类型', value: '研究中心' },
          { label: '合作起始', value: '2021 年' },
          { label: '合作产品', value: 'V-CLAMP · 运动医学' },
        ],
      },
    },
  },
  {
    slug: 'vetagro-sup-lyon',
    email: 'partenariats@vetagro-sup.fr',
    website: 'https://www.vetagro-sup.fr',
    backgroundUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&h=900&fit=crop',
    i18n: {
      en: {
        detailDescription: `<p>VetAgro Sup in Lyon is Hongyu’s European training partner for certified surgeons and academic exchange around ECVIM-related meetings. Faculty surgeons deliver hands-on V-CLAMP modules for French and EU clinicians.</p>
<h3>Partnership Scope</h3>
<ul>
<li>Certified surgeon training for Europe</li>
<li>Academic conference collaboration</li>
<li>Clinical case mentoring</li>
</ul>`,
        stats: [
          { label: 'Certified Surgeons', value: '4' },
          { label: 'Workshops / Year', value: '10' },
          { label: 'Partnership Since', value: '2020' },
          { label: 'Cumulative Cases', value: '1,100+' },
        ],
        cooperationInfo: [
          { label: 'Partnership Type', value: 'Training Base' },
          { label: 'Start Year', value: '2020' },
          { label: 'Products', value: 'V-CLAMP' },
        ],
      },
      'zh-CN': {
        detailDescription: `<p>里昂 VetAgro Sup 是竑宇欧洲区认证术者培训与 ECVIM 相关学术交流合作机构，由资深外科团队面向法国及欧盟临床医师开展 V-CLAMP 实操课程。</p>
<h3>合作内容</h3>
<ul>
<li>欧洲认证术者培训</li>
<li>学术会议合作</li>
<li>临床病例带教</li>
</ul>`,
        stats: [
          { label: '认证术者', value: '4' },
          { label: '年工作坊', value: '10' },
          { label: '合作起始年份', value: '2020' },
          { label: '累计手术案例', value: '1,100+' },
        ],
        cooperationInfo: [
          { label: '合作类型', value: '培训基地' },
          { label: '合作起始', value: '2020 年' },
          { label: '合作产品', value: 'V-CLAMP' },
        ],
      },
    },
  },
  {
    slug: 'cornell-veterinary-hospital',
    email: 'hospital@vet.cornell.edu',
    website: 'https://www.vet.cornell.edu',
    backgroundUrl: 'https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=1600&h=900&fit=crop',
    i18n: {
      en: {
        detailDescription: `<p>Cornell University Veterinary Hospital is a core North American clinical partner supporting Hongyu’s FDA-oriented evidence generation for vessel-sealing devices. Soft-tissue surgeons apply V-CLAMP in high-complexity referral cases and contribute structured registries.</p>
<h3>Partnership Scope</h3>
<ul>
<li>FDA-oriented clinical data collaboration</li>
<li>Referral soft-tissue surgery pathways</li>
<li>Resident education on vessel sealing</li>
</ul>`,
        stats: [
          { label: 'Certified Surgeons', value: '5' },
          { label: 'Joint Papers', value: '11' },
          { label: 'Partnership Since', value: '2019' },
          { label: 'Cumulative Cases', value: '3,600+' },
        ],
        cooperationInfo: [
          { label: 'Partnership Type', value: 'Clinical Partner' },
          { label: 'Start Year', value: '2019' },
          { label: 'Products', value: 'V-CLAMP' },
        ],
      },
      'zh-CN': {
        detailDescription: `<p>康奈尔大学兽医院是竑宇北美核心临床合作机构，支撑血管闭合器械面向 FDA 的循证数据建设。软组织外科团队在高复杂度转诊病例中应用 V-CLAMP，并参与结构化病例登记。</p>
<h3>合作内容</h3>
<ul>
<li>FDA 相关临床数据合作</li>
<li>软组织转诊手术路径</li>
<li>住院医师血管闭合培训</li>
</ul>`,
        stats: [
          { label: '认证术者', value: '5' },
          { label: '联合论文', value: '11' },
          { label: '合作起始年份', value: '2019' },
          { label: '累计手术案例', value: '3,600+' },
        ],
        cooperationInfo: [
          { label: '合作类型', value: '临床合作' },
          { label: '合作起始', value: '2019 年' },
          { label: '合作产品', value: 'V-CLAMP' },
        ],
      },
    },
  },
  {
    slug: 'uc-davis-veterinary-medical-center',
    email: 'vmth@ucdavis.edu',
    website: 'https://www.vetmed.ucdavis.edu',
    backgroundUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&h=900&fit=crop',
    i18n: {
      en: {
        detailDescription: `<p>UC Davis Veterinary Medical Center collaborates with Hongyu on advanced surgical research, including soft-tissue sealing workflows that inform future cardiovascular device programs. Faculty surgeons contribute translational study design and teaching clinic protocols.</p>
<h3>Partnership Scope</h3>
<ul>
<li>Translational and pre-clinical research</li>
<li>Advanced soft-tissue sealing protocols</li>
<li>Academic teaching clinic integration</li>
</ul>`,
        stats: [
          { label: 'Certified Surgeons', value: '4' },
          { label: 'Research Programs', value: '3' },
          { label: 'Partnership Since', value: '2020' },
          { label: 'Cumulative Cases', value: '2,400+' },
        ],
        cooperationInfo: [
          { label: 'Partnership Type', value: 'Research Center' },
          { label: 'Start Year', value: '2020' },
          { label: 'Products', value: 'V-CLAMP · R&D' },
        ],
      },
      'zh-CN': {
        detailDescription: `<p>加州大学戴维斯分校兽医医疗中心与竑宇合作推进高阶外科研究，包括为未来心血管器械项目提供参考的软组织闭合流程。教师团队参与转化研究设计与教学门诊规范建设。</p>
<h3>合作内容</h3>
<ul>
<li>转化与临床前研究</li>
<li>高阶软组织闭合规范</li>
<li>教学门诊整合</li>
</ul>`,
        stats: [
          { label: '认证术者', value: '4' },
          { label: '研究项目', value: '3' },
          { label: '合作起始年份', value: '2020' },
          { label: '累计手术案例', value: '2,400+' },
        ],
        cooperationInfo: [
          { label: '合作类型', value: '研究中心' },
          { label: '合作起始', value: '2020 年' },
          { label: '合作产品', value: 'V-CLAMP · 研发' },
        ],
      },
    },
  },
  {
    slug: 'ontario-veterinary-college',
    email: 'ovcinfo@uoguelph.ca',
    website: 'https://ovc.uoguelph.ca',
    backgroundUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1600&h=900&fit=crop',
    i18n: {
      en: {
        detailDescription: `<p>Ontario Veterinary College is Hongyu’s Canadian training and academic exchange hub. Certified surgeon courses emphasize reproducible vessel-sealing technique and case-based assessment for North American practitioners.</p>
<h3>Partnership Scope</h3>
<ul>
<li>North America certified training</li>
<li>Academic exchange programs</li>
<li>Case-based skills assessment</li>
</ul>`,
        stats: [
          { label: 'Certified Surgeons', value: '3' },
          { label: 'Training Cohorts / Year', value: '6' },
          { label: 'Partnership Since', value: '2021' },
          { label: 'Cumulative Cases', value: '780+' },
        ],
        cooperationInfo: [
          { label: 'Partnership Type', value: 'Training Base' },
          { label: 'Start Year', value: '2021' },
          { label: 'Products', value: 'V-CLAMP' },
        ],
      },
      'zh-CN': {
        detailDescription: `<p>安大略兽医学院是竑宇在加拿大的培训与学术交流核心合作伙伴。认证课程强调可复现的血管闭合技术，以及面向北美从业者的病例化考核。</p>
<h3>合作内容</h3>
<ul>
<li>北美认证培训</li>
<li>学术交流项目</li>
<li>病例化技能考核</li>
</ul>`,
        stats: [
          { label: '认证术者', value: '3' },
          { label: '年培训批次', value: '6' },
          { label: '合作起始年份', value: '2021' },
          { label: '累计手术案例', value: '780+' },
        ],
        cooperationInfo: [
          { label: '合作类型', value: '培训基地' },
          { label: '合作起始', value: '2021 年' },
          { label: '合作产品', value: 'V-CLAMP' },
        ],
      },
    },
  },
  {
    slug: 'dubai-veterinary-center',
    email: 'info@dubaivetcenter.ae',
    website: 'https://www.dubaivetcenter.ae',
    backgroundUrl: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&h=900&fit=crop',
    i18n: {
      en: {
        detailDescription: `<p>Dubai Veterinary Center was among the first Gulf-region clinical partners to introduce Hongyu vessel-sealing technology into daily soft-tissue surgery. The center supports regional case sharing and surgeon onboarding for the Middle East network.</p>
<h3>Partnership Scope</h3>
<ul>
<li>Gulf-region clinical introduction of V-CLAMP</li>
<li>Soft-tissue surgery pathway adoption</li>
<li>Regional surgeon onboarding</li>
</ul>`,
        stats: [
          { label: 'Certified Surgeons', value: '2' },
          { label: 'Joint Cases Shared', value: '120+' },
          { label: 'Partnership Since', value: '2022' },
          { label: 'Cumulative Cases', value: '540+' },
        ],
        cooperationInfo: [
          { label: 'Partnership Type', value: 'Clinical Partner' },
          { label: 'Start Year', value: '2022' },
          { label: 'Products', value: 'V-CLAMP' },
        ],
      },
      'zh-CN': {
        detailDescription: `<p>迪拜兽医中心是海湾地区首批将竑宇血管闭合技术引入日常软组织外科的临床合作伙伴，并支撑中东网络的病例分享与术者入驻培训。</p>
<h3>合作内容</h3>
<ul>
<li>海湾地区 V-CLAMP 临床导入</li>
<li>软组织手术路径落地</li>
<li>区域术者入驻培训</li>
</ul>`,
        stats: [
          { label: '认证术者', value: '2' },
          { label: '共享病例', value: '120+' },
          { label: '合作起始年份', value: '2022' },
          { label: '累计手术案例', value: '540+' },
        ],
        cooperationInfo: [
          { label: '合作类型', value: '临床合作' },
          { label: '合作起始', value: '2022 年' },
          { label: '合作产品', value: 'V-CLAMP' },
        ],
      },
    },
  },
];

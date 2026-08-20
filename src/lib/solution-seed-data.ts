export type SolutionSeedPair = { label: string; value: string };

export type SolutionSeedBlockItem = {
  icon?: string;
  imageRole: string;
  smallTitle?: string;
  largeTitle: string;
  description: string;
};

export type SolutionSeedBlock = {
  type: 'split' | 'summary' | 'specifications';
  layout?: 'image-left' | 'image-right' | 'multi-3';
  imageRole?: string;
  smallTitle: string;
  largeTitle: string;
  description: string;
  items?: SolutionSeedBlockItem[];
};

export type SolutionSeedRecord = {
  slug: string;
  categorySlug: string;
  sortOrder: number;
  badgeText: string;
  title: string;
  largeTitle: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  coverRole: string;
  stats: SolutionSeedPair[];
  productParams: SolutionSeedPair[];
  tags: string[];
  blocks: SolutionSeedBlock[];
  imageSources: Record<string, { localFile?: string; remoteUrl: string }>;
};

const SURGICAL_OR = 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=1400&q=80';
const HEART_MODEL = 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=1400&q=80';
const LAB_BENCH = 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1400&q=80';
const MICROSCOPE = 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=1400&q=80';
const SURGERY_TEAM = 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=1400&q=80';
const LAB_COATS = 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1400&q=80';

export const SOLUTION_SEED_RECORDS: SolutionSeedRecord[] = [
  {
    slug: 'v-clamp',
    categorySlug: 'v-clamp',
    sortOrder: 0,
    badgeText: 'Flagship Product',
    title: 'V-CLAMP Vascular Closure System',
    largeTitle: 'V-CLAMP Vascular Closure System',
    description:
      'A self-developed precision vascular closure platform with intelligent pressure feedback and adaptive clamping-force control, delivering reliable intraoperative hemostasis and lower postoperative complication rates.',
    seoTitle: 'V-CLAMP Vascular Closure System | Hongyu Medical',
    seoDescription:
      'Veterinary vascular closure system for dogs and cats with adaptive clamping force, biocompatible coating, and ISO 10993 / CE credentials.',
    coverRole: 'cover',
    stats: [
      { label: 'Reduction in intraoperative blood loss', value: '67%' },
      { label: 'Shorter procedure time', value: '23%' },
      { label: 'Adaptive clamping-force range', value: '15N' },
      { label: 'Cumulative surgical cases', value: '200K+' },
    ],
    productParams: [
      { label: 'Product models', value: 'V-CLAMP 100 / 200 / 300' },
      { label: 'Applicable vessel diameter', value: '2 mm – 8 mm' },
      { label: 'Clamping-force range', value: '5 N – 15 N (adaptive)' },
      { label: 'Closure response time', value: '≤ 1.5 seconds' },
      { label: 'Coating material', value: 'Medical-grade titanium alloy (Ti-6Al-4V)' },
      { label: 'Sterilization', value: 'Ethylene oxide / gamma irradiation' },
      { label: 'Shelf life', value: '36 months' },
      { label: 'Certifications', value: 'ISO 10993, CE, FDA 510(k) in process' },
    ],
    tags: [
      'Intelligent Pressure Feedback',
      'Biocompatible Coating',
      'Quick Release Mechanism',
      'ISO 10993 Certified',
      'CE Mark',
    ],
    imageSources: {
      cover: { localFile: 'sol-hero.jpg', remoteUrl: SURGICAL_OR },
      overview: { localFile: 'sol-overview.jpg', remoteUrl: SURGERY_TEAM },
      feature1: { localFile: 'sol-feature1.jpg', remoteUrl: HEART_MODEL },
      feature2: { localFile: 'sol-feature2.jpg', remoteUrl: LAB_BENCH },
      feature3: { localFile: 'sol-feature3.jpg', remoteUrl: MICROSCOPE },
      clinical: { localFile: 'sol-clinical.jpg', remoteUrl: SURGICAL_OR },
    },
    blocks: [
      {
        type: 'split',
        layout: 'image-right',
        imageRole: 'overview',
        smallTitle: 'OVERVIEW · Product overview',
        largeTitle: 'Redefining vascular management in companion-animal surgery',
        description:
          'V-CLAMP is Hongyu Medical’s flagship closure system for small- and medium-sized dogs and cats. A dual-mode mechanism — mechanical clamping plus a biocompatible coating — is designed for low-leakage, low-trauma hemostasis during vessel management. The platform is ISO 10993 tested and CE marked, supporting splenectomy, hepatic lobectomy, nephrectomy, thyroidectomy, and ovariohysterectomy.',
      },
      {
        type: 'summary',
        layout: 'multi-3',
        smallTitle: 'FEATURES · Technical advantages',
        largeTitle: 'Three core technology advantages',
        description: 'Every design choice is aimed at safer, more efficient surgical outcomes.',
        items: [
          {
            icon: 'layers',
            imageRole: 'feature1',
            largeTitle: 'Intelligent pressure feedback',
            description:
              'A miniature pressure sensor monitors clamping force in real time and auto-tunes to the optimal closure window, reducing over-crush injury to the vessel wall.',
          },
          {
            icon: 'heart',
            imageRole: 'feature2',
            largeTitle: 'Biocompatible coating',
            description:
              'A medical-grade titanium alloy coating has passed ISO 10993 cytotoxicity testing to lower tissue reaction and postoperative adhesion risk.',
          },
          {
            icon: 'clock',
            imageRole: 'feature3',
            largeTitle: 'Quick-release mechanism',
            description:
              'One-handed, one-click release allows instrument withdrawal within three seconds after closure, shortening turnover time in the OR.',
          },
        ],
      },
      {
        type: 'split',
        layout: 'image-left',
        imageRole: 'clinical',
        smallTitle: 'CLINICAL · Clinical applications',
        largeTitle: 'Built for multi-scene veterinary surgery',
        description:
          'V-CLAMP supports intraoperative vessel management across common canine and feline procedures, with consistent hemostasis in multi-center clinical use.',
        items: [
          {
            imageRole: 'clinical',
            largeTitle: 'Abdominal surgery',
            description: 'Splenectomy, hepatic lobectomy, nephrectomy, adrenal tumor excision',
          },
          {
            imageRole: 'clinical',
            largeTitle: 'Soft-tissue surgery',
            description: 'Thyroidectomy, ovariohysterectomy, local tumor resection',
          },
          {
            imageRole: 'clinical',
            largeTitle: 'Orthopedic support',
            description: 'Intraoperative bleeding control and periosteal vessel closure',
          },
          {
            imageRole: 'clinical',
            largeTitle: 'Emergency surgery',
            description: 'Rapid hemostasis for traumatic hemorrhage',
          },
        ],
      },
      {
        type: 'specifications',
        smallTitle: 'SPECIFICATIONS · Technical specs',
        largeTitle: 'Product specifications',
        description: '',
      },
    ],
  },
  {
    slug: 'sports-medicine',
    categorySlug: 'sports-medicine',
    sortOrder: 1,
    badgeText: 'Mature Product Line',
    title: 'Sports Medicine Solutions',
    largeTitle: 'Sports Medicine Solutions',
    description:
      'A complete minimally invasive repair line for canine and feline joint injury, covering arthroscopic assistance, bio-anchor ligament reconstruction, and bone-tunnel instrumentation for CCL rupture and patellar luxation.',
    seoTitle: 'Veterinary Sports Medicine Solutions | Hongyu Medical',
    seoDescription:
      'Arthroscopy, bio-anchors, absorbable suture, and minimally invasive access tools for companion-animal sports medicine.',
    coverRole: 'cover',
    stats: [
      { label: 'Target joint procedures covered', value: '12+' },
      { label: 'Average incision length', value: '<2 cm' },
      { label: 'Absorbable suture window', value: '6–12 mo' },
      { label: 'Hospitals using the line', value: '180+' },
    ],
    productParams: [
      { label: 'Primary indication', value: 'CCL rupture, patellar luxation, meniscal injury' },
      { label: 'Species', value: 'Dogs and cats, 3–40 kg' },
      { label: 'Arthroscopy diameter', value: '1.9 mm / 2.7 mm' },
      { label: 'Anchor material', value: 'PEEK / bioabsorbable composite' },
      { label: 'Suture', value: 'UHMWPE + absorbable PGA options' },
      { label: 'Sterilization', value: 'EO' },
      { label: 'Shelf life', value: '24 months' },
      { label: 'Certifications', value: 'ISO 13485, CE' },
    ],
    tags: ['Arthroscopic System', 'Bio-anchor Device', 'Absorbable Suture', 'Minimally Invasive Access'],
    imageSources: {
      cover: { localFile: 'sol-feature1.jpg', remoteUrl: HEART_MODEL },
      overview: { localFile: 'sol-overview.jpg', remoteUrl: SURGERY_TEAM },
      feature1: { localFile: 'sol-feature1.jpg', remoteUrl: HEART_MODEL },
      feature2: { localFile: 'sol-feature2.jpg', remoteUrl: LAB_BENCH },
      feature3: { localFile: 'sol-feature3.jpg', remoteUrl: MICROSCOPE },
      clinical: { localFile: 'sol-clinical.jpg', remoteUrl: SURGICAL_OR },
    },
    blocks: [
      {
        type: 'split',
        layout: 'image-right',
        imageRole: 'overview',
        smallTitle: 'OVERVIEW · Product overview',
        largeTitle: 'Standardized repair for everyday joint injuries',
        description:
          'The sports-medicine line packages arthroscopic visualization, bone-tunnel preparation, and biologic anchoring into a repeatable workflow for referral and high-volume GP surgery. Instrumentation is sized for canine stifles and feline joints without forcing human-ortho kits into veterinary anatomy.',
      },
      {
        type: 'summary',
        layout: 'multi-3',
        smallTitle: 'FEATURES · Technical advantages',
        largeTitle: 'A complete intra-articular toolkit',
        description: 'From portal placement to ligament reconstruction, the line is designed as one system.',
        items: [
          {
            icon: 'target',
            imageRole: 'feature1',
            largeTitle: 'Arthroscopic visualization',
            description: 'Compact optics and irrigation control for small stifles, shoulders, and elbows.',
          },
          {
            icon: 'shield',
            imageRole: 'feature2',
            largeTitle: 'Bio-anchor reconstruction',
            description: 'PEEK and absorbable anchors with pull-out values sized for canine CCL loads.',
          },
          {
            icon: 'activity',
            imageRole: 'feature3',
            largeTitle: 'Minimally invasive access',
            description: 'Portal dilators and aiming guides reduce periarticular trauma and shorten recovery.',
          },
        ],
      },
      {
        type: 'split',
        layout: 'image-left',
        imageRole: 'clinical',
        smallTitle: 'CLINICAL · Clinical applications',
        largeTitle: 'Built around the most common sports injuries',
        description:
          'Use the line as a standard kit for extracapsular and arthroscopic-assisted reconstruction, with matching implants for revision cases.',
        items: [
          { imageRole: 'clinical', largeTitle: 'Stifle', description: 'CCL rupture, meniscal tear, TPLO adjunct hemostasis' },
          { imageRole: 'clinical', largeTitle: 'Patella', description: 'Medial patellar luxation reconstruction' },
          { imageRole: 'clinical', largeTitle: 'Shoulder', description: 'OCD debridement and labral stabilization' },
          { imageRole: 'clinical', largeTitle: 'Rehab pathway', description: 'Early weight-bearing protocols with absorbable fixation' },
        ],
      },
      {
        type: 'specifications',
        smallTitle: 'SPECIFICATIONS · Technical specs',
        largeTitle: 'Product specifications',
        description: '',
      },
    ],
  },
  {
    slug: 'pacemaker',
    categorySlug: 'pacemaker',
    sortOrder: 2,
    badgeText: 'Clinical Stage',
    title: 'Cardiac Pacemaker',
    largeTitle: 'Cardiac Pacemaker',
    description:
      'A miniaturized implantable rhythm-management device for small- and medium-sized dogs and cats, using a low-impedance lead and a long-life battery. Animal studies are complete; a multi-center clinical trial is underway for sick sinus syndrome and AV block.',
    seoTitle: 'Veterinary Cardiac Pacemaker | Hongyu Medical',
    seoDescription:
      'Miniaturized implantable pacemaker for dogs and cats with 8+ year battery life and low-impedance electrodes. Now in multi-center clinical trials.',
    coverRole: 'cover',
    stats: [
      { label: 'Projected battery life', value: '8 yr+' },
      { label: 'Generator mass', value: '11 g' },
      { label: 'Lead impedance', value: '<500 Ω' },
      { label: 'Trial centers', value: '8' },
    ],
    productParams: [
      { label: 'Device class', value: 'Implantable pulse generator' },
      { label: 'Target species', value: 'Dogs and cats, 2–18 kg' },
      { label: 'Indications (trial)', value: 'Sick sinus syndrome, high-grade AV block' },
      { label: 'Battery chemistry', value: 'Lithium-iodine' },
      { label: 'Lead', value: 'Steroid-eluting, low-impedance bipolar' },
      { label: 'Programmer', value: 'Wireless veterinary programmer' },
      { label: 'MRI conditionality', value: 'Conditional, under evaluation' },
      { label: 'Regulatory status', value: 'Multi-center clinical trial' },
    ],
    tags: ['Miniaturized Design', '8+ Year Battery Life', 'Low-impedance Lead', 'In Clinical Trials'],
    imageSources: {
      cover: { localFile: 'sol-feature2.jpg', remoteUrl: LAB_COATS },
      overview: { localFile: 'sol-overview.jpg', remoteUrl: LAB_BENCH },
      feature1: { localFile: 'sol-feature1.jpg', remoteUrl: HEART_MODEL },
      feature2: { localFile: 'sol-feature2.jpg', remoteUrl: LAB_COATS },
      feature3: { localFile: 'sol-feature3.jpg', remoteUrl: MICROSCOPE },
      clinical: { localFile: 'sol-clinical.jpg', remoteUrl: SURGERY_TEAM },
    },
    blocks: [
      {
        type: 'split',
        layout: 'image-right',
        imageRole: 'overview',
        smallTitle: 'OVERVIEW · Product overview',
        largeTitle: 'Rhythm management sized for companion animals',
        description:
          'Human-derived generators are often too large and too high-output for cats and small dogs. This veterinary-specific generator and lead set targets a smaller pocket, lower chronic thresholds, and a programming workflow that veterinary cardiologists can run in clinic.',
      },
      {
        type: 'summary',
        layout: 'multi-3',
        smallTitle: 'FEATURES · Technical advantages',
        largeTitle: 'Designed around veterinary constraints',
        description: 'Size, longevity, and follow-up were specified with referral cardiology in mind.',
        items: [
          {
            icon: 'cpu',
            imageRole: 'feature1',
            largeTitle: 'Miniaturized generator',
            description: 'An 11 g can reduces pocket tension in cats and toy-breed dogs.',
          },
          {
            icon: 'clock',
            imageRole: 'feature2',
            largeTitle: 'Long-life power system',
            description: 'Projected longevity exceeds eight years at typical veterinary pacing outputs.',
          },
          {
            icon: 'activity',
            imageRole: 'feature3',
            largeTitle: 'Low-impedance electrode',
            description: 'Steroid-eluting bipolar leads are designed to keep capture thresholds stable.',
          },
        ],
      },
      {
        type: 'split',
        layout: 'image-left',
        imageRole: 'clinical',
        smallTitle: 'CLINICAL · Clinical applications',
        largeTitle: 'Now advancing through multi-center trials',
        description:
          'Animal studies are complete. Current work focuses on implant technique, chronic threshold stability, and quality-of-life scores in dogs and cats with bradyarrhythmia.',
        items: [
          { imageRole: 'clinical', largeTitle: 'Sick sinus syndrome', description: 'Sinus pauses and chronotropic incompetence in aging dogs' },
          { imageRole: 'clinical', largeTitle: 'AV block', description: 'High-grade and complete atrioventricular block' },
          { imageRole: 'clinical', largeTitle: 'Follow-up', description: 'In-clinic interrogation and remote check protocol' },
          { imageRole: 'clinical', largeTitle: 'Training', description: 'Implant workshops for veterinary cardiology teams' },
        ],
      },
      {
        type: 'specifications',
        smallTitle: 'SPECIFICATIONS · Technical specs',
        largeTitle: 'Product specifications',
        description: '',
      },
    ],
  },
  {
    slug: 'in-research',
    categorySlug: 'in-research',
    sortOrder: 3,
    badgeText: 'R&D Pipeline',
    title: 'R&D Products',
    largeTitle: 'R&D Products',
    description:
      'Next-generation programs in intelligent surgical navigation, bioabsorbable materials, and AI-assisted diagnosis. Optical-tracking navigation is in concept validation; PLGA-based absorbable materials have completed animal studies with a 6–12 month degradation window.',
    seoTitle: 'Veterinary R&D Pipeline | Hongyu Medical',
    seoDescription:
      'Hongyu Medical research pipeline: optical surgical navigation, PLGA absorbable materials, and AI-assisted diagnosis for companion-animal care.',
    coverRole: 'cover',
    stats: [
      { label: 'Active pipeline programs', value: '3' },
      { label: 'Absorbable degradation window', value: '6–12 mo' },
      { label: 'Navigation tracking accuracy', value: '<1 mm' },
      { label: 'Concept-validation sites', value: '4' },
    ],
    productParams: [
      { label: 'Navigation sensing', value: 'Optical tracking' },
      { label: 'Target accuracy', value: '< 1 mm registration error' },
      { label: 'Absorbable polymer', value: 'PLGA-based composite' },
      { label: 'Degradation window', value: '6–12 months' },
      { label: 'AI module', value: 'Radiograph / ultrasound assist (research)' },
      { label: 'Current stage', value: 'Concept validation / animal studies' },
      { label: 'Intended species', value: 'Dogs and cats' },
      { label: 'Regulatory path', value: 'Pre-clinical documentation in progress' },
    ],
    tags: ['Intelligent Surgical Navigation', 'Bioabsorbable Materials', 'AI-assisted Diagnosis', 'Proof of Concept'],
    imageSources: {
      cover: { localFile: 'sol-feature3.jpg', remoteUrl: MICROSCOPE },
      overview: { localFile: 'sol-overview.jpg', remoteUrl: LAB_BENCH },
      feature1: { localFile: 'sol-feature1.jpg', remoteUrl: HEART_MODEL },
      feature2: { localFile: 'sol-feature2.jpg', remoteUrl: LAB_COATS },
      feature3: { localFile: 'sol-feature3.jpg', remoteUrl: MICROSCOPE },
      clinical: { localFile: 'sol-clinical.jpg', remoteUrl: SURGICAL_OR },
    },
    blocks: [
      {
        type: 'split',
        layout: 'image-right',
        imageRole: 'overview',
        smallTitle: 'OVERVIEW · Product overview',
        largeTitle: 'Building the next decade of veterinary surgery',
        description:
          'The in-research portfolio concentrates on three platforms: optical navigation for complex osteotomies, absorbable implants that disappear on a predictable timeline, and AI tools that support imaging reads in busy hospitals. None of these programs are commercial yet; they are shared here so partners can follow the science.',
      },
      {
        type: 'summary',
        layout: 'multi-3',
        smallTitle: 'FEATURES · Technical advantages',
        largeTitle: 'Three research platforms',
        description: 'Each platform is independently staged, with shared materials science and data infrastructure.',
        items: [
          {
            icon: 'target',
            imageRole: 'feature1',
            largeTitle: 'Optical surgical navigation',
            description: 'Marker-based tracking aimed at sub-millimeter registration for osteotomy and implant placement.',
          },
          {
            icon: 'flask',
            imageRole: 'feature2',
            largeTitle: 'Bioabsorbable materials',
            description: 'PLGA composites with a 6–12 month degradation window after animal studies.',
          },
          {
            icon: 'cpu',
            imageRole: 'feature3',
            largeTitle: 'AI-assisted diagnosis',
            description: 'Research models for radiograph and ultrasound triage, designed for veterinary workflows.',
          },
        ],
      },
      {
        type: 'split',
        layout: 'image-left',
        imageRole: 'clinical',
        smallTitle: 'CLINICAL · Research focus',
        largeTitle: 'From bench to first-in-animal evidence',
        description:
          'Programs move through benchtop validation, cadaver labs, and controlled animal studies before any commercial claim. Partner hospitals can join selected concept-validation sites.',
        items: [
          { imageRole: 'clinical', largeTitle: 'Orthopedics', description: 'Corrective osteotomy guidance and implant alignment' },
          { imageRole: 'clinical', largeTitle: 'Soft tissue', description: 'Absorbable meshes and closure adjuncts' },
          { imageRole: 'clinical', largeTitle: 'Imaging AI', description: 'Chest and abdominal radiograph assist' },
          { imageRole: 'clinical', largeTitle: 'Collaboration', description: 'Open to research-center partnerships' },
        ],
      },
      {
        type: 'specifications',
        smallTitle: 'SPECIFICATIONS · Technical specs',
        largeTitle: 'Product specifications',
        description: '',
      },
    ],
  },
];

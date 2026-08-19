export type InsightBoardKey = 'case' | 'paper' | 'experience';

export type InsightSeedArticle = {
  slug: string;
  boardKey: InsightBoardKey;
  title: string;
  summary: string;
  seoTitle: string;
  seoDescription: string;
  authorName: string;
  authorTitle: string;
  coverFile: string;
  /** ISO date string for publishedAt / createdAt ordering */
  publishedAt: string;
  body: string;
};

function section(id: string, title: string, inner: string) {
  return `<h2 id="${id}">${title}</h2>${inner}`;
}

function paragraphs(...texts: string[]) {
  return texts.map((text) => `<p>${text}</p>`).join('');
}

function list(items: string[]) {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
}

function quote(text: string, cite: string) {
  return `<blockquote><p>${text}</p><cite>${cite}</cite></blockquote>`;
}

const SPLENECTOMY_BODY = [
  section(
    'background',
    'Background',
    paragraphs(
      'Splenectomy remains one of the most common abdominal procedures in canine surgery, indicated for splenic masses, torsion, and traumatic rupture. Intraoperative hemostasis along splenic vessels is a critical step and a leading source of bleeding complications.',
      'The V-CLAMP vascular closure system combines adaptive pressure feedback with a biocompatible coating, designed to improve vessel management in small-to-medium companion animals. This retrospective review summarizes outcomes from six referral centers between January 2024 and December 2025.',
    ),
  ),
  section(
    'methods',
    'Methods',
    paragraphs(
      'Three hundred twenty-eight splenectomy cases were included: 216 in the V-CLAMP cohort and 112 in a conventional ligation control group. Inclusion criteria included dogs aged ≥1 year (5–30 kg), splenic tumor or torsion as the primary indication, normal preoperative coagulation, and surgery performed by V-CLAMP-certified surgeons.',
    ) + list([
      'Age ≥ 1 year, body weight 5–30 kg',
      'Splenic tumor or torsion as primary indication',
      'Preoperative coagulation within reference range',
      'Certified surgeon for device cohort',
    ]),
  ),
  section(
    'results',
    'Results',
    paragraphs('Statistical analysis showed significant advantages for the V-CLAMP group across key endpoints:') +
      '<table><thead><tr><th>Endpoint</th><th>V-CLAMP</th><th>Control</th></tr></thead><tbody><tr><td>Estimated blood loss reduction</td><td>67%</td><td>—</td></tr><tr><td>Procedure time reduction</td><td>23%</td><td>—</td></tr><tr><td>Intraoperative leak rate</td><td>0.5%</td><td>4.2%</td></tr><tr><td>30-day complication rate</td><td>0.9%</td><td>3.8%</td></tr></tbody></table>' +
      quote(
        'Adaptive clamping force reduced vessel wall trauma; histology showed better endothelial integrity at the closure site compared with conventional ties.',
        '— Dr. Mingyuan Zhang, Chief Physician, Beijing Companion Animal Medical Center',
      ) +
      paragraphs(
        'In the splenic tumor subgroup (n = 156), 30-day survival was 94.2% with V-CLAMP versus 87.5% in controls (p = 0.038).',
      ),
  ),
  section(
    'discussion',
    'Discussion & Conclusion',
    paragraphs('These findings support V-CLAMP as an effective adjunct for canine splenectomy.') +
      list([
        '<strong>Precise hemostasis:</strong> Pressure feedback keeps clamp force within a safe window.',
        '<strong>Efficiency:</strong> Faster vessel handling shortened overall procedure time.',
        '<strong>Favorable recovery:</strong> Low complication rates support broader adoption.',
      ]) +
      paragraphs(
        'Future work will expand sample size through multicenter randomized trials and evaluate applications in hepatic and renal resection.',
      ),
  ),
].join('');

function standardBody(
  intro: string,
  sections: Array<{ id: string; title: string; content: string }>,
) {
  return paragraphs(intro) + sections.map((s) => section(s.id, s.title, s.content)).join('');
}

const COVER = {
  surgery: 'art-hero.jpg',
  lab: 'patent-lab.jpg',
  dog: 'vet-1.jpg',
  conference: 'edu-1.jpg',
  heart: 'sol-clinical.jpg',
  tech: 'sol-feature1.jpg',
  vet: 'news-1.jpg',
  microscope: 'patent-microscope.jpg',
};

export const INSIGHT_BOARD_I18N_EN: Array<{
  key: InsightBoardKey;
  name: string;
  description: string;
}> = [
  {
    key: 'case',
    name: 'Case Review',
    description: 'Retrospective clinical cases and operative decision-making.',
  },
  {
    key: 'paper',
    name: 'Industry Papers',
    description: 'Peer-oriented summaries of surgical technique and device science.',
  },
  {
    key: 'experience',
    name: 'Surgeon Experience',
    description: 'Field notes, follow-up reports, and conference highlights.',
  },
];

export const INSIGHT_SEED_ARTICLES: InsightSeedArticle[] = [
  {
    slug: 'v-clamp-canine-splenectomy-review',
    boardKey: 'case',
    title: 'V-CLAMP Application Review in Canine Splenectomy',
    summary:
      'Multi-center data from 328 splenectomies show reduced blood loss, shorter operative time, and fewer complications with V-CLAMP versus conventional ligation.',
    seoTitle: 'V-CLAMP in Canine Splenectomy — Case Review',
    seoDescription:
      'Retrospective review of V-CLAMP use in canine splenectomy across six referral centers.',
    authorName: 'Dr. Mingyuan Zhang',
    authorTitle: 'Chief Physician',
    coverFile: COVER.surgery,
    publishedAt: '2026-07-15T10:00:00.000Z',
    body: SPLENECTOMY_BODY,
  },
  {
    slug: 'hepatic-lobectomy-vascular-management',
    boardKey: 'case',
    title: 'Vascular Management Strategies in Canine Hepatic Lobectomy',
    summary:
      'Three representative cases illustrate branch-specific closure sequencing and intraoperative decision points during hepatic resection.',
    seoTitle: 'Hepatic Lobectomy Vascular Management — Case Review',
    seoDescription: 'Case-based review of vascular closure during canine hepatic lobectomy.',
    authorName: 'Dr. Elena Morales',
    authorTitle: 'Staff Surgeon',
    coverFile: COVER.vet,
    publishedAt: '2026-03-10T10:00:00.000Z',
    body: standardBody(
      'Hepatic lobectomy requires careful planning of inflow and outflow control. This note summarizes three cases where staged V-CLAMP application reduced conversion to open hemostasis.',
      [
        {
          id: 'case-selection',
          title: 'Case Selection',
          content: paragraphs(
            'Cases included solitary hepatic mass, limited lobar involvement, and stable hemodynamics at induction.',
          ),
        },
        {
          id: 'technique',
          title: 'Technique Highlights',
          content:
            list([
              'Identify major pedicle before parenchymal transection',
              'Apply sequential closure from peripheral to central branches',
              'Confirm hemostasis before specimen removal',
            ]),
        },
        {
          id: 'outcomes',
          title: 'Outcomes',
          content: paragraphs(
            'All three dogs were discharged within 48 hours without transfusion. Follow-up imaging at 30 days showed uneventful healing.',
          ),
        },
      ],
    ),
  },
  {
    slug: 'canine-acl-arthroscopic-repair-advances',
    boardKey: 'paper',
    title: 'Advances in Arthroscopic-Assisted Repair of Canine ACL Rupture',
    summary:
      'Minimally invasive approaches combined with bio-anchor systems improve functional recovery rates in medium-sized athletic dogs.',
    seoTitle: 'Canine ACL Arthroscopic Repair — Industry Paper',
    seoDescription: 'Summary of arthroscopic-assisted ACL repair techniques in dogs.',
    authorName: 'Dr. James Whitfield',
    authorTitle: 'Sports Medicine Lead',
    coverFile: COVER.dog,
    publishedAt: '2026-06-20T10:00:00.000Z',
    body: standardBody(
      'Cranial cruciate ligament rupture is the leading orthopedic condition in active dogs. Arthroscopic-assisted repair continues to evolve with improved anchor materials and portal optimization.',
      [
        {
          id: 'indications',
          title: 'Indications',
          content: paragraphs('Partial tears in dogs under 25 kg with stable meniscal status remain the best candidates.'),
        },
        {
          id: 'technique',
          title: 'Technical Notes',
          content: list([
            'Single-bundle reconstruction with medial portal visualization',
            'Titanium anchor placement at anatomic footprint',
            'Early controlled rehabilitation from week two',
          ]),
        },
        {
          id: 'functional-outcomes',
          title: 'Functional Outcomes',
          content: paragraphs(
            'Pilot series report 91% return-to-function at six months; further RCT data are warranted.',
          ),
        },
      ],
    ),
  },
  {
    slug: 'v-clamp-intelligent-pressure-feedback-technology',
    boardKey: 'paper',
    title: 'Intelligent Pressure Feedback in the V-CLAMP System',
    summary:
      'An engineering overview of adaptive clamping algorithms and how closed-loop feedback reduces vessel wall injury during laparoscopic procedures.',
    seoTitle: 'V-CLAMP Pressure Feedback Technology',
    seoDescription: 'Technical paper on adaptive pressure feedback in V-CLAMP vascular closure.',
    authorName: 'Dr. Lin Wei',
    authorTitle: 'Director of R&D',
    coverFile: COVER.tech,
    publishedAt: '2026-03-25T10:00:00.000Z',
    body: standardBody(
      'Consistent hemostasis without tissue crush injury depends on force control. V-CLAMP integrates micro-pressure sensing with a calibrated release mechanism.',
      [
        {
          id: 'architecture',
          title: 'System Architecture',
          content: paragraphs(
            'Force is sampled at 200 Hz; firmware adjusts jaw pressure within a clinician-defined band before lock engagement.',
          ),
        },
        {
          id: 'bench-testing',
          title: 'Bench Testing',
          content: paragraphs(
            'Porcine vessel models showed 40% lower peak wall stress versus fixed-force clips at equivalent leak rates.',
          ),
        },
        {
          id: 'clinical-relevance',
          title: 'Clinical Relevance',
          content: paragraphs(
            'Reduced thermal and mechanical trauma may translate to faster recovery in laparoscopic vascular steps.',
          ),
        },
      ],
    ),
  },
  {
    slug: 'small-dog-pacemaker-three-year-follow-up',
    boardKey: 'experience',
    title: 'Three-Year Follow-Up After Pacemaker Implantation in Small Dogs',
    summary:
      'Longitudinal outcomes in dogs under 8 kg show 82% three-year survival and improved quality-of-life scores versus medical management alone.',
    seoTitle: 'Small Dog Pacemaker — Three-Year Follow-Up',
    seoDescription: 'Surgeon experience report on pacemaker implantation in small-breed dogs.',
    authorName: 'Dr. Sarah Okonkwo',
    authorTitle: 'Cardiology Specialist',
    coverFile: COVER.heart,
    publishedAt: '2026-05-12T10:00:00.000Z',
    body: standardBody(
      'Bradyarrhythmia in toy breeds presents unique lead routing and pocket-size constraints. This follow-up series tracks 24 implantations from 2022–2025.',
      [
        {
          id: 'cohort',
          title: 'Cohort',
          content: paragraphs('Median weight 5.4 kg; AV block and sick sinus syndrome were the dominant indications.'),
        },
        {
          id: 'follow-up',
          title: 'Follow-Up',
          content: paragraphs(
            'Three-year survival was 82%; owner-reported activity scores improved in 88% of survivors.',
          ),
        },
        {
          id: 'lessons',
          title: 'Lessons Learned',
          content: list([
            'Prefer jugular approach in dogs under 4 kg',
            'Schedule generator revision planning at implant',
            'Telemetric checks reduce emergency presentations',
          ]),
        },
      ],
    ),
  },
  {
    slug: 'wsava-2026-symposium-recap',
    boardKey: 'experience',
    title: 'WSAVA 2026 Symposium Recap: Hongyu Surgical Innovation Track',
    summary:
      'Highlights from the Hongyu-sponsored session with speakers from twelve countries on minimally invasive hemostasis and training pathways.',
    seoTitle: 'WSAVA 2026 Symposium Recap',
    seoDescription: 'Conference recap of the Hongyu surgical innovation symposium at WSAVA 2026.',
    authorName: 'Editorial Team',
    authorTitle: 'Hongyu Medical',
    coverFile: COVER.conference,
    publishedAt: '2026-04-18T10:00:00.000Z',
    body: standardBody(
      'The 2026 WSAVA program featured a dedicated track on laparoscopic vascular control with record attendance from APAC referral centers.',
      [
        {
          id: 'sessions',
          title: 'Key Sessions',
          content: list([
            'Standardized V-CLAMP training curriculum',
            'Regional variation in splenectomy protocols',
            'Panel: building center-of-excellence partnerships',
          ]),
        },
        {
          id: 'audience',
          title: 'Audience',
          content: paragraphs('More than 420 registrants joined live; recordings are available to certified partners.'),
        },
      ],
    ),
  },
  {
    slug: 'fda-510k-v-clamp-acceptance-notice',
    boardKey: 'experience',
    title: 'FDA 510(k) Acceptance Notice for V-CLAMP',
    summary:
      'The U.S. FDA has accepted the V-CLAMP premarket notification, advancing regulatory review for North American commercialization.',
    seoTitle: 'V-CLAMP FDA 510(k) Acceptance',
    seoDescription: 'Company update on FDA 510(k) acceptance for the V-CLAMP vascular closure system.',
    authorName: 'Regulatory Affairs',
    authorTitle: 'Hongyu Medical',
    coverFile: COVER.lab,
    publishedAt: '2026-02-08T10:00:00.000Z',
    body: standardBody(
      'Hongyu Medical announced FDA acceptance of the 510(k) submission for V-CLAMP, covering laparoscopic vascular closure indications in companion animals.',
      [
        {
          id: 'submission',
          title: 'Submission Scope',
          content: paragraphs(
            'The dossier includes bench biocompatibility, animal safety studies, and clinical performance summaries from international sites.',
          ),
        },
        {
          id: 'next-steps',
          title: 'Next Steps',
          content: paragraphs(
            'The review timeline will determine U.S. market entry sequencing alongside existing CE-marked territories.',
          ),
        },
      ],
    ),
  },
  // Extra articles per board (3 each) for related reading depth
  {
    slug: 'feline-spay-v-clamp-initial-application',
    boardKey: 'case',
    title: 'Initial V-CLAMP Use in Feline Ovariohysterectomy',
    summary: 'Pilot cases suggest reliable pedicle closure with shorter ligature steps in high-volume spay programs.',
    seoTitle: 'V-CLAMP in Feline Spay — Case Review',
    seoDescription: 'Early case series on V-CLAMP in feline ovariohysterectomy.',
    authorName: 'Dr. Ana Petrova',
    authorTitle: 'Soft Tissue Surgeon',
    coverFile: COVER.vet,
    publishedAt: '2025-11-20T10:00:00.000Z',
    body: standardBody(
      'High-volume spay clinics seek reproducible pedicle security. Twelve consecutive feline OHE cases used V-CLAMP for ovarian pedicles without intraoperative bleeding events.',
      [
        { id: 'protocol', title: 'Protocol', content: paragraphs('Standard midline approach; device applied after pedicle isolation.') },
        { id: 'results', title: 'Results', content: paragraphs('Median pedicle time decreased 18% versus surgeon historical baseline.') },
      ],
    ),
  },
  {
    slug: 'splenic-mass-emergency-closure-protocol',
    boardKey: 'case',
    title: 'Emergency Splenic Mass: Closure Protocol Under Time Pressure',
    summary: 'A structured checklist for unstable patients requiring rapid splenectomy with device-assisted hemostasis.',
    seoTitle: 'Emergency Splenic Mass Closure Protocol',
    seoDescription: 'Case-based emergency splenectomy closure protocol.',
    authorName: 'Dr. Mingyuan Zhang',
    authorTitle: 'Chief Physician',
    coverFile: COVER.surgery,
    publishedAt: '2025-10-05T10:00:00.000Z',
    body: standardBody(
      'Hemodynamically unstable splenic rupture demands parallel resuscitation and operative control.',
      [
        {
          id: 'checklist',
          title: 'Checklist',
          content: list([
            'Cross-match and activate MTP before incision',
            'Pre-place laparoscopic ports if abdomen stable for insufflation',
            'Prioritize hilum control before specimen manipulation',
          ]),
        },
      ],
    ),
  },
  {
    slug: 'gastric-volvulus-vascular-sequence',
    boardKey: 'case',
    title: 'Vascular Closure Sequence in Gastric Dilatation-Volvulus',
    summary: 'Operative sequencing when short gastric vessels require multiple controlled closures during GDV correction.',
    seoTitle: 'GDV Vascular Closure Sequence',
    seoDescription: 'Case review of vascular closure sequencing in canine GDV surgery.',
    authorName: 'Dr. Elena Morales',
    authorTitle: 'Staff Surgeon',
    coverFile: COVER.surgery,
    publishedAt: '2025-09-14T10:00:00.000Z',
    body: standardBody(
      'GDV surgery often combines gastric derotation with splenic assessment. This case series documents closure order when short gastric and splenic vessels both require attention.',
      [
        { id: 'sequence', title: 'Sequence', content: paragraphs('Derotation first, then address compromised short gastric branches before splenic hilum if indicated.') },
      ],
    ),
  },
  {
    slug: 'minimally-invasive-shoulder-arthroscopy-canine',
    boardKey: 'paper',
    title: 'Minimally Invasive Shoulder Arthroscopy in Canine Sports Injuries',
    summary: 'Portal triangulation and instrument sizing considerations for medium working breeds.',
    seoTitle: 'Canine Shoulder Arthroscopy Paper',
    seoDescription: 'Industry paper on shoulder arthroscopy in canine sports medicine.',
    authorName: 'Dr. James Whitfield',
    authorTitle: 'Sports Medicine Lead',
    coverFile: COVER.dog,
    publishedAt: '2025-12-01T10:00:00.000Z',
    body: standardBody(
      'Shoulder instability in agility dogs benefits from diagnostic arthroscopy before open stabilization.',
      [
        { id: 'portals', title: 'Portal Setup', content: paragraphs('Use caudolateral and cranial portals with 2.7 mm scope for dogs 15–25 kg.') },
      ],
    ),
  },
  {
    slug: 'biocompatible-coating-vascular-closure-devices',
    boardKey: 'paper',
    title: 'Biocompatible Coatings for Laparoscopic Vascular Closure Devices',
    summary: 'Material science review of coatings that limit tissue adhesion and inflammatory response at the jaw interface.',
    seoTitle: 'Biocompatible Coatings — Industry Paper',
    seoDescription: 'Review of biocompatible coatings used in vascular closure devices.',
    authorName: 'Dr. Lin Wei',
    authorTitle: 'Director of R&D',
    coverFile: COVER.microscope,
    publishedAt: '2025-08-22T10:00:00.000Z',
    body: standardBody(
      'Non-stick coatings reduce jaw fouling and may lower thermal transfer during electrosurgical adjacency.',
      [
        { id: 'materials', title: 'Materials', content: paragraphs('Plasma-sprayed ceramic variants showed lowest platelet adhesion in vitro.') },
      ],
    ),
  },
  {
    slug: 'comparative-hemostasis-laparoscopic-surgery',
    boardKey: 'paper',
    title: 'Comparative Hemostasis Methods in Laparoscopic Veterinary Surgery',
    summary: 'A structured comparison of clips, ties, energy devices, and adaptive clamps for vessel diameters under 5 mm.',
    seoTitle: 'Comparative Hemostasis in Laparoscopic Surgery',
    seoDescription: 'Industry comparison of hemostasis techniques in laparoscopic veterinary surgery.',
    authorName: 'Dr. James Whitfield',
    authorTitle: 'Sports Medicine Lead',
    coverFile: COVER.lab,
    publishedAt: '2025-07-30T10:00:00.000Z',
    body: standardBody(
      'Device selection should match vessel caliber, visibility, and required transaction plane.',
      [
        {
          id: 'comparison',
          title: 'Comparison Table',
          content:
            '<table><thead><tr><th>Method</th><th>Best For</th><th>Caution</th></tr></thead><tbody><tr><td>Ligation</td><td>Open hilum</td><td>Time</td></tr><tr><td>Clip</td><td>Small branches</td><td>Slippage risk</td></tr><tr><td>Adaptive clamp</td><td>2–5 mm vessels</td><td>Training</td></tr></tbody></table>',
        },
      ],
    ),
  },
  {
    slug: 'surgeon-interview-five-years-v-clamp',
    boardKey: 'experience',
    title: 'Surgeon Interview: Five Years of V-CLAMP in Daily Practice',
    summary: 'Dr. Zhang reflects on training adoption, case mix evolution, and tips for new programs.',
    seoTitle: 'Five Years of V-CLAMP — Surgeon Interview',
    seoDescription: 'Interview with an experienced V-CLAMP surgeon after five years of use.',
    authorName: 'Dr. Mingyuan Zhang',
    authorTitle: 'Chief Physician',
    coverFile: COVER.vet,
    publishedAt: '2025-08-18T10:00:00.000Z',
    body: standardBody(
      'After five years and more than 400 device-assisted procedures, standardized training and case selection remain the strongest predictors of smooth adoption.',
      [
        { id: 'training', title: 'On Training', content: paragraphs('Simulated hilum models cut the learning curve from 20 to 8 supervised cases.') },
        { id: 'advice', title: 'Advice', content: paragraphs('Start with elective splenectomy before expanding to hepatic or GDV settings.') },
      ],
    ),
  },
  {
    slug: 'training-program-v-clamp-certification',
    boardKey: 'experience',
    title: 'V-CLAMP Certification Program: 2025 Cohort Outcomes',
    summary: 'Completion rates, competency assessments, and six-month proctor feedback from the global certification track.',
    seoTitle: 'V-CLAMP Certification Program Outcomes',
    seoDescription: 'Report on the 2025 V-CLAMP surgeon certification cohort.',
    authorName: 'Clinical Education',
    authorTitle: 'Hongyu Medical',
    coverFile: COVER.conference,
    publishedAt: '2025-06-02T10:00:00.000Z',
    body: standardBody(
      'The 2025 certification cohort enrolled 86 surgeons across 14 countries; 79 completed proctored assessment.',
      [
        { id: 'competency', title: 'Competency', content: paragraphs('OSATS-style checklists covered port placement, device loading, and leak check.') },
      ],
    ),
  },
  {
    slug: 'center-of-excellence-partnership-launch',
    boardKey: 'experience',
    title: 'Center of Excellence Partnership Launch in East Asia',
    summary: 'Hongyu announces a co-development partnership with a tertiary referral network for laparoscopic training and outcomes registry.',
    seoTitle: 'Center of Excellence Partnership Launch',
    seoDescription: 'Launch announcement for a Center of Excellence partnership in East Asia.',
    authorName: 'Partnerships Team',
    authorTitle: 'Hongyu Medical',
    coverFile: COVER.conference,
    publishedAt: '2025-05-15T10:00:00.000Z',
    body: standardBody(
      'The partnership will host quarterly proctoring weeks and contribute de-identified outcomes to a shared registry.',
      [
        { id: 'goals', title: 'Goals', content: list(['Standardize training', 'Publish annual outcomes report', 'Expand resident rotation slots']) },
      ],
    ),
  },
];

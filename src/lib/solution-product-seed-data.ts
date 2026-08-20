export type SolutionProductStat = { label: string; value: string };

export type SolutionProductImageSource = { localFile?: string; remoteUrl: string };

export type SolutionProductAttachmentSeed = { name: string; fileBase: string };

export type SolutionProductSeedRecord = {
  solutionSlug: string;
  spu: string;
  slug: string;
  badgeText: string;
  name: string;
  shortDescription: string;
  extraText: string;
  descriptionHtml: string;
  stats: SolutionProductStat[];
  seoTitle: string;
  seoDescription: string;
  imageSources: {
    cover: SolutionProductImageSource;
    gallery: SolutionProductImageSource[];
  };
  attachments: SolutionProductAttachmentSeed[];
};

const SURGICAL_OR = 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=1400&q=80';
const HEART_MODEL = 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=1400&q=80';
const LAB_BENCH = 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1400&q=80';
const MICROSCOPE = 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=1400&q=80';
const SURGERY_TEAM = 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=1400&q=80';
const LAB_COATS = 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1400&q=80';
const VET_CLINIC = 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1400&q=80';
const MED_DEVICE = 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=80';

export const SOLUTION_PRODUCT_SEED_RECORDS: SolutionProductSeedRecord[] = [
  /* ───── V-CLAMP Vascular Closure System ───── */
  {
    solutionSlug: 'v-clamp',
    spu: 'HY-VC-100',
    slug: 'v-clamp-100',
    badgeText: 'Entry · Small dogs & cats',
    name: 'V-CLAMP 100',
    shortDescription:
      'V-CLAMP 100 is the entry model of the V-CLAMP vascular closure platform, engineered for small dogs and cats with vessel diameters between 2 mm and 4 mm. A miniature pressure sensor reads clamping force in real time and holds the jaw within the optimal closure window, so the vessel wall is sealed without being crushed. The medical-grade titanium alloy jaw carries a biocompatible coating that has passed ISO 10993 cytotoxicity testing, and the one-handed quick-release mechanism lets the surgeon withdraw the instrument within three seconds of closure. Typical use covers ovariohysterectomy, splenectomy, thyroidectomy, and local tumor resection in patients from 2 kg to 15 kg.',
    extraText: 'Vessel 2–4 mm · Clamping force 5–9 N · Response ≤1.5 s · Ti-6Al-4V · EO sterile · 36-month shelf life',
    descriptionHtml: `<p><strong>V-CLAMP 100</strong> is the entry configuration of Hongyu Medical's self-developed vascular closure platform. It was specified around the anatomy of cats and small-breed dogs, where human-derived clips are frequently oversized and deliver far more clamping force than a 2–4 mm vessel can tolerate. The device combines a mechanical jaw, a miniature pressure sensor, and a biocompatible titanium alloy coating into a single-use instrument that a single surgeon can operate without an assistant.</p>
<p>Closure is driven by an adaptive force loop. As the jaw travels, the embedded sensor samples the load applied to the vessel wall and trims the final clamping position into a 5 N to 9 N window. The intent is to avoid the two classic failure modes of manual clip application: under-compression, which leaves a leak path once perfusion returns, and over-compression, which crushes the intima and seeds late-stage thrombus or wall necrosis. In bench testing, closure completes in 1.5 seconds or less from the moment the jaw contacts the vessel.</p>
<h3>Features</h3>
<ul>
<li><strong>Intelligent pressure feedback.</strong> A miniature strain sensor monitors clamping force continuously and auto-tunes the jaw to the optimal closure window, reducing over-crush injury to the vessel wall.</li>
<li><strong>Biocompatible coating.</strong> The Ti-6Al-4V medical-grade titanium alloy jaw carries a coating that has passed ISO 10993 cytotoxicity, sensitization, and irritation testing, lowering tissue reaction and postoperative adhesion risk.</li>
<li><strong>Quick-release mechanism.</strong> One-handed, single-click release allows instrument withdrawal within three seconds after closure, which shortens turnover time in a busy operating room.</li>
<li><strong>Small-patient geometry.</strong> The jaw profile and shaft length are sized for the working depth of feline and toy-breed abdominal surgery rather than scaled down from a human instrument.</li>
<li><strong>Single-use sterile packaging.</strong> Each unit ships ethylene-oxide sterilized in a peel-open pouch that fits standard back-table setup without a separate reprocessing cycle.</li>
</ul>
<h3>Indications</h3>
<ul>
<li>Ovariohysterectomy and orchiectomy in cats and small-breed dogs</li>
<li>Splenectomy and partial hepatic lobectomy where hilar vessels fall in the 2–4 mm range</li>
<li>Thyroidectomy and parathyroid surgery requiring fine-vessel control</li>
<li>Local tumor resection with dense peripheral vascular supply</li>
<li>Emergency hemostasis for traumatic hemorrhage in patients from 2 kg to 15 kg</li>
</ul>
<h3>Regulatory</h3>
<ul>
<li>Biological evaluation completed to ISO 10993 (cytotoxicity, sensitization, irritation)</li>
<li>Manufactured under an ISO 13485 quality management system</li>
<li>CE marked for the European market</li>
<li>FDA 510(k) submission in process</li>
<li>Ethylene oxide sterilization validated to ISO 11135; 36-month shelf life</li>
</ul>`,
    stats: [
      { label: 'Applicable vessel diameter', value: '2 mm – 4 mm' },
      { label: 'Clamping-force range', value: '5 N – 9 N (adaptive)' },
      { label: 'Closure response time', value: '≤ 1.5 seconds' },
      { label: 'Target patient weight', value: '2 kg – 15 kg' },
      { label: 'Jaw material', value: 'Medical-grade titanium alloy (Ti-6Al-4V)' },
      { label: 'Release time after closure', value: '≤ 3 seconds' },
      { label: 'Sterilization', value: 'Ethylene oxide (ISO 11135)' },
      { label: 'Shelf life', value: '36 months' },
      { label: 'Packaging', value: 'Single-use sterile pouch' },
      { label: 'Certifications', value: 'ISO 10993, ISO 13485, CE' },
    ],
    seoTitle: 'V-CLAMP 100 Vascular Closure Device | Hongyu Medical',
    seoDescription:
      'V-CLAMP 100 is an entry-level veterinary vascular closure device for cats and small dogs, covering 2–4 mm vessels with adaptive 5–9 N clamping force, ISO 10993 biocompatible titanium coating, and a three-second quick-release mechanism.',
    imageSources: {
      cover: { localFile: 'sol-hero.jpg', remoteUrl: SURGICAL_OR },
      gallery: [
        { localFile: 'sol-feature1.jpg', remoteUrl: MED_DEVICE },
        { localFile: 'sol-overview.jpg', remoteUrl: SURGERY_TEAM },
        { localFile: 'sol-clinical.jpg', remoteUrl: VET_CLINIC },
      ],
    },
    attachments: [
      { name: 'V-CLAMP 100 Instructions for Use', fileBase: 'v-clamp-100-ifu' },
      { name: 'V-CLAMP 100 Technical Specification Sheet', fileBase: 'v-clamp-100-spec-sheet' },
      { name: 'V-CLAMP 100 Clinical Evidence Summary', fileBase: 'v-clamp-100-clinical-summary' },
      { name: 'V-CLAMP 100 Sterilization & Handling Guide', fileBase: 'v-clamp-100-sterilization-guide' },
    ],
  },
  {
    solutionSlug: 'v-clamp',
    spu: 'HY-VC-200',
    slug: 'v-clamp-200',
    badgeText: 'Standard · Medium dogs',
    name: 'V-CLAMP 200',
    shortDescription:
      'V-CLAMP 200 is the standard configuration of the V-CLAMP platform, covering vessel diameters from 4 mm to 6 mm in medium-breed dogs. It carries the same adaptive pressure-feedback loop as the entry model but with a wider jaw and a 7 N to 12 N force window, making it the default choice for routine abdominal and soft-tissue procedures in patients from 12 kg to 30 kg. The reinforced shaft holds alignment at greater working depth, and the biocompatible titanium coating is unchanged from the rest of the family.',
    extraText: 'Vessel 4–6 mm · Clamping force 7–12 N · Response ≤1.5 s · Ti-6Al-4V · EO sterile · 36-month shelf life',
    descriptionHtml: `<p><strong>V-CLAMP 200</strong> is the standard-duty member of the V-CLAMP vascular closure family and the model most hospitals adopt first. It targets 4 mm to 6 mm vessels in medium-breed dogs, the range that covers the majority of splenic, renal, and hepatic hilar work in general practice. The adaptive pressure-feedback loop is carried over from V-CLAMP 100, retuned to a 7 N to 12 N window to match the thicker vessel wall and higher perfusion pressure of a larger patient.</p>
<p>The shaft is reinforced to hold jaw alignment at greater working depth, which matters when the surgeon is reaching into a deep abdomen through a limited incision. Closure response and quick-release timing are identical to the rest of the family, so a team that trains on one model can move across the range without relearning the instrument.</p>
<h3>Features</h3>
<ul>
<li><strong>Adaptive clamping force.</strong> Real-time sensing trims the jaw into a 7 N to 12 N window sized for medium-breed vessel walls.</li>
<li><strong>Reinforced shaft.</strong> Increased torsional stiffness keeps the jaw square to the vessel at deep working angles.</li>
<li><strong>Wide-profile jaw.</strong> The broader contact face distributes load across the vessel wall to reduce focal intimal injury.</li>
<li><strong>Consistent handling.</strong> Trigger travel and one-click release match V-CLAMP 100 and 300, shortening cross-model training.</li>
</ul>
<h3>Indications</h3>
<ul>
<li>Splenectomy and hepatic lobectomy in medium-breed dogs</li>
<li>Nephrectomy and adrenal tumor excision</li>
<li>Ovariohysterectomy in patients from 12 kg to 30 kg</li>
<li>Intraoperative hemostasis during soft-tissue mass resection</li>
</ul>
<h3>Regulatory</h3>
<ul>
<li>Biological evaluation completed to ISO 10993</li>
<li>Manufactured under an ISO 13485 quality management system</li>
<li>CE marked for the European market</li>
<li>Ethylene oxide sterilization validated to ISO 11135; 36-month shelf life</li>
</ul>`,
    stats: [
      { label: 'Applicable vessel diameter', value: '4 mm – 6 mm' },
      { label: 'Clamping-force range', value: '7 N – 12 N (adaptive)' },
      { label: 'Closure response time', value: '≤ 1.5 seconds' },
      { label: 'Target patient weight', value: '12 kg – 30 kg' },
      { label: 'Jaw material', value: 'Medical-grade titanium alloy (Ti-6Al-4V)' },
      { label: 'Shaft', value: 'Reinforced, torsion-resistant' },
      { label: 'Sterilization', value: 'Ethylene oxide (ISO 11135)' },
      { label: 'Shelf life', value: '36 months' },
      { label: 'Certifications', value: 'ISO 10993, ISO 13485, CE' },
    ],
    seoTitle: 'V-CLAMP 200 Vascular Closure Device | Hongyu Medical',
    seoDescription:
      'V-CLAMP 200 is the standard veterinary vascular closure device for medium-breed dogs, covering 4–6 mm vessels with adaptive 7–12 N clamping force, a reinforced shaft, and ISO 10993 biocompatible titanium construction.',
    imageSources: {
      cover: { localFile: 'sol-feature1.jpg', remoteUrl: MED_DEVICE },
      gallery: [
        { localFile: 'sol-hero.jpg', remoteUrl: SURGICAL_OR },
        { localFile: 'sol-feature2.jpg', remoteUrl: LAB_BENCH },
      ],
    },
    attachments: [
      { name: 'V-CLAMP 200 Instructions for Use', fileBase: 'v-clamp-200-ifu' },
      { name: 'V-CLAMP 200 Technical Specification Sheet', fileBase: 'v-clamp-200-spec-sheet' },
      { name: 'V-CLAMP 200 Surgical Technique Guide', fileBase: 'v-clamp-200-technique-guide' },
    ],
  },
  {
    solutionSlug: 'v-clamp',
    spu: 'HY-VC-300',
    slug: 'v-clamp-300',
    badgeText: 'Advanced · Large dogs',
    name: 'V-CLAMP 300',
    shortDescription:
      'V-CLAMP 300 is the advanced configuration of the V-CLAMP platform, rated for vessel diameters from 6 mm to 8 mm in large-breed dogs. The 10 N to 15 N adaptive force window and extended jaw are specified for high-flow hilar vessels, and the long shaft reaches deep abdominal and thoracic sites without losing alignment. It is the model used for emergency hemorrhage control in patients above 25 kg.',
    extraText: 'Vessel 6–8 mm · Clamping force 10–15 N · Response ≤1.5 s · Extended jaw · EO sterile · 36-month shelf life',
    descriptionHtml: `<p><strong>V-CLAMP 300</strong> is the highest-capacity model in the V-CLAMP vascular closure family, specified for 6 mm to 8 mm vessels in large-breed dogs. High-flow hilar vessels in a 25 kg to 60 kg patient need both a longer sealing face and a higher clamping ceiling than the standard model provides, and this configuration raises the adaptive window to 10 N to 15 N while keeping the same closed-loop force control.</p>
<p>The extended shaft is the other distinguishing feature. Deep abdominal and intrathoracic approaches put the target vessel well below the incision plane, and the longer instrument keeps the jaw perpendicular to the vessel where a shorter tool would have to be angled. This makes V-CLAMP 300 the model of choice for emergency hemorrhage control, where the surgeon has one attempt to seat the clamp correctly.</p>
<h3>Features</h3>
<ul>
<li><strong>High-capacity force window.</strong> Adaptive control across 10 N to 15 N handles thick-walled, high-flow vessels.</li>
<li><strong>Extended jaw and shaft.</strong> Longer reach maintains perpendicular seating at deep abdominal and thoracic sites.</li>
<li><strong>Emergency-ready handling.</strong> Single-handed actuation and one-click release support rapid hemostasis under time pressure.</li>
<li><strong>Shared platform coating.</strong> Identical ISO 10993 tested titanium alloy surface as the rest of the family.</li>
</ul>
<h3>Indications</h3>
<ul>
<li>Splenic and renal hilar closure in large-breed dogs</li>
<li>Major hepatic lobectomy with high-flow inflow vessels</li>
<li>Traumatic hemorrhage requiring rapid intraoperative control</li>
<li>Deep thoracic and caudal abdominal vessel management</li>
</ul>
<h3>Regulatory</h3>
<ul>
<li>Biological evaluation completed to ISO 10993</li>
<li>Manufactured under an ISO 13485 quality management system</li>
<li>CE marked for the European market</li>
<li>Ethylene oxide sterilization validated to ISO 11135; 36-month shelf life</li>
</ul>`,
    stats: [
      { label: 'Applicable vessel diameter', value: '6 mm – 8 mm' },
      { label: 'Clamping-force range', value: '10 N – 15 N (adaptive)' },
      { label: 'Closure response time', value: '≤ 1.5 seconds' },
      { label: 'Target patient weight', value: '25 kg – 60 kg' },
      { label: 'Jaw material', value: 'Medical-grade titanium alloy (Ti-6Al-4V)' },
      { label: 'Shaft length', value: 'Extended reach' },
      { label: 'Primary use case', value: 'High-flow hilar and emergency hemostasis' },
      { label: 'Sterilization', value: 'Ethylene oxide (ISO 11135)' },
      { label: 'Shelf life', value: '36 months' },
      { label: 'Certifications', value: 'ISO 10993, ISO 13485, CE' },
    ],
    seoTitle: 'V-CLAMP 300 Vascular Closure Device | Hongyu Medical',
    seoDescription:
      'V-CLAMP 300 is the advanced veterinary vascular closure device for large-breed dogs, rated for 6–8 mm vessels with a 10–15 N adaptive clamping window, extended jaw and shaft, and ISO 10993 biocompatible titanium construction.',
    imageSources: {
      cover: { localFile: 'sol-feature2.jpg', remoteUrl: LAB_BENCH },
      gallery: [
        { localFile: 'sol-hero.jpg', remoteUrl: SURGICAL_OR },
        { localFile: 'sol-clinical.jpg', remoteUrl: SURGERY_TEAM },
      ],
    },
    attachments: [
      { name: 'V-CLAMP 300 Instructions for Use', fileBase: 'v-clamp-300-ifu' },
      { name: 'V-CLAMP 300 Technical Specification Sheet', fileBase: 'v-clamp-300-spec-sheet' },
      { name: 'V-CLAMP 300 Emergency Hemostasis Protocol', fileBase: 'v-clamp-300-emergency-protocol' },
    ],
  },

  /* ───── Sports Medicine Solutions ───── */
  {
    solutionSlug: 'sports-medicine',
    spu: 'HY-SM-100',
    slug: 'stifle-anchor-pro',
    badgeText: 'Core · CCL reconstruction',
    name: 'Stifle Anchor Pro',
    shortDescription:
      'Stifle Anchor Pro is a bone-anchor system for cranial cruciate ligament reconstruction in dogs and cats from 3 kg to 40 kg. The kit pairs PEEK and bioabsorbable composite anchors with a matched drill, aiming guide, and UHMWPE suture, so the surgeon can complete tunnel preparation and fixation with one tray. Pull-out strength is specified against canine CCL loading rather than adapted from human shoulder hardware.',
    extraText: 'Anchor 3.5/4.5 mm · PEEK or absorbable · Pull-out ≥320 N · UHMWPE suture · EO sterile · 24-month shelf life',
    descriptionHtml: `<p><strong>Stifle Anchor Pro</strong> is the anchoring backbone of the Hongyu sports-medicine line. It addresses cranial cruciate ligament rupture, the single most common orthopedic presentation in canine practice, with implants and instrumentation specified around canine stifle loads instead of repurposed human shoulder hardware. Each tray contains anchors, a matched drill, an aiming guide, and pre-loaded suture, so tunnel preparation and fixation happen without switching kits mid-procedure.</p>
<p>Two anchor materials are offered on the same geometry. PEEK anchors are the default for revision cases and larger patients where long-term radiographic visibility and permanent fixation are preferred. Bioabsorbable composite anchors suit primary repair in smaller patients, resorbing over a 6 to 12 month window that tracks the expected remodeling timeline of the reconstructed ligament.</p>
<h3>Features</h3>
<ul>
<li><strong>Load-matched fixation.</strong> Pull-out strength of 320 N or greater is specified against measured canine CCL loading, not extrapolated from human data.</li>
<li><strong>Dual material options.</strong> PEEK and bioabsorbable composite anchors share one geometry and one instrument set.</li>
<li><strong>Integrated aiming guide.</strong> The guide fixes tunnel entry and exit points to keep the graft path reproducible between surgeons.</li>
<li><strong>Pre-loaded UHMWPE suture.</strong> High-tenacity suture arrives seated in the anchor, removing a threading step at the table.</li>
</ul>
<h3>Indications</h3>
<ul>
<li>Cranial cruciate ligament rupture, primary extracapsular and arthroscopic-assisted reconstruction</li>
<li>CCL revision surgery following failed primary repair</li>
<li>Collateral ligament reconstruction in the stifle and tarsus</li>
<li>Soft-tissue reattachment where bone anchoring is required</li>
</ul>
<h3>Regulatory</h3>
<ul>
<li>Manufactured under an ISO 13485 quality management system</li>
<li>CE marked for the European market</li>
<li>Biological evaluation completed to ISO 10993 for implanted components</li>
<li>Ethylene oxide sterilization validated to ISO 11135; 24-month shelf life</li>
</ul>`,
    stats: [
      { label: 'Anchor diameters', value: '3.5 mm / 4.5 mm' },
      { label: 'Anchor materials', value: 'PEEK / bioabsorbable composite' },
      { label: 'Pull-out strength', value: '≥ 320 N' },
      { label: 'Suture', value: 'UHMWPE, pre-loaded' },
      { label: 'Absorbable resorption window', value: '6 – 12 months' },
      { label: 'Target patient weight', value: '3 kg – 40 kg' },
      { label: 'Kit contents', value: 'Anchors, drill, aiming guide, suture' },
      { label: 'Sterilization', value: 'Ethylene oxide (ISO 11135)' },
      { label: 'Shelf life', value: '24 months' },
      { label: 'Certifications', value: 'ISO 13485, ISO 10993, CE' },
    ],
    seoTitle: 'Stifle Anchor Pro CCL Anchor System | Hongyu Medical',
    seoDescription:
      'Stifle Anchor Pro is a veterinary bone-anchor system for canine and feline CCL reconstruction, offering PEEK and bioabsorbable anchors, an integrated aiming guide, pre-loaded UHMWPE suture, and pull-out strength above 320 N.',
    imageSources: {
      cover: { localFile: 'sol-feature1.jpg', remoteUrl: HEART_MODEL },
      gallery: [
        { localFile: 'sol-feature2.jpg', remoteUrl: LAB_BENCH },
        { localFile: 'sol-clinical.jpg', remoteUrl: SURGICAL_OR },
      ],
    },
    attachments: [
      { name: 'Stifle Anchor Pro Instructions for Use', fileBase: 'stifle-anchor-pro-ifu' },
      { name: 'Stifle Anchor Pro Surgical Technique Guide', fileBase: 'stifle-anchor-pro-technique-guide' },
      { name: 'Stifle Anchor Pro Biomechanical Test Report', fileBase: 'stifle-anchor-pro-biomech-report' },
    ],
  },
  {
    solutionSlug: 'sports-medicine',
    spu: 'HY-SM-200',
    slug: 'meniscal-repair-kit',
    badgeText: 'Arthroscopic · Meniscus',
    name: 'Meniscal Repair Kit',
    shortDescription:
      'The Meniscal Repair Kit provides arthroscopic instrumentation for meniscal tear management in canine and feline stifles. It combines 1.9 mm and 2.7 mm scope-compatible probes, a curved suture passer, and absorbable PGA suture so the surgeon can debride or repair through portals under 2 cm. Instrument curvature is set for the tight caudal compartment of a canine stifle rather than a human knee.',
    extraText: 'Scope 1.9/2.7 mm · Portal <2 cm · Curved passer · Absorbable PGA suture · EO sterile · 24-month shelf life',
    descriptionHtml: `<p>The <strong>Meniscal Repair Kit</strong> covers the intra-articular half of the sports-medicine workflow. Meniscal injury accompanies a large share of cranial cruciate ligament ruptures, and treating it well requires visualization and instrument access in the caudal compartment of a stifle that may be only a few centimeters across. This kit is built for that constraint: compatible with 1.9 mm and 2.7 mm arthroscopes, with probes and a suture passer whose curvature is set for canine and feline joint geometry.</p>
<p>Both debridement and repair pathways are supported. Where the tear is not reconstructable, the probe and punch set allows controlled partial meniscectomy. Where the tissue is viable, the curved passer places absorbable PGA suture across the tear with the joint distracted, and the absorbable profile means no permanent material is left in the articular space.</p>
<h3>Features</h3>
<ul>
<li><strong>Small-joint curvature.</strong> Probe and passer radii are set for the canine caudal compartment, not scaled from human knee instruments.</li>
<li><strong>Dual scope compatibility.</strong> Works with both 1.9 mm and 2.7 mm arthroscopes across feline and large-breed cases.</li>
<li><strong>Minimally invasive access.</strong> Portal dilators keep the working incision under 2 cm to limit periarticular trauma.</li>
<li><strong>Absorbable repair suture.</strong> PGA suture resorbs after the healing window, leaving no permanent implant in the joint.</li>
</ul>
<h3>Indications</h3>
<ul>
<li>Medial meniscal tear associated with CCL rupture</li>
<li>Bucket-handle and radial tear debridement</li>
<li>Arthroscopic-assisted partial meniscectomy</li>
<li>Diagnostic arthroscopy of the stifle and tarsus</li>
</ul>
<h3>Regulatory</h3>
<ul>
<li>Manufactured under an ISO 13485 quality management system</li>
<li>CE marked for the European market</li>
<li>Biological evaluation completed to ISO 10993 for implanted suture</li>
<li>Ethylene oxide sterilization validated to ISO 11135; 24-month shelf life</li>
</ul>`,
    stats: [
      { label: 'Arthroscope compatibility', value: '1.9 mm / 2.7 mm' },
      { label: 'Average portal length', value: '< 2 cm' },
      { label: 'Suture material', value: 'Absorbable PGA' },
      { label: 'Suture resorption window', value: '6 – 12 months' },
      { label: 'Instrument curvature', value: 'Canine caudal compartment' },
      { label: 'Kit contents', value: 'Probes, punch, curved passer, dilators' },
      { label: 'Target patient weight', value: '3 kg – 40 kg' },
      { label: 'Sterilization', value: 'Ethylene oxide (ISO 11135)' },
      { label: 'Shelf life', value: '24 months' },
      { label: 'Certifications', value: 'ISO 13485, ISO 10993, CE' },
    ],
    seoTitle: 'Veterinary Meniscal Repair Kit | Hongyu Medical',
    seoDescription:
      'The Hongyu Meniscal Repair Kit delivers arthroscopic meniscal debridement and repair for canine and feline stifles, with 1.9 mm and 2.7 mm scope compatibility, small-joint instrument curvature, and absorbable PGA suture.',
    imageSources: {
      cover: { localFile: 'sol-feature3.jpg', remoteUrl: MICROSCOPE },
      gallery: [
        { localFile: 'sol-feature1.jpg', remoteUrl: HEART_MODEL },
        { localFile: 'sol-overview.jpg', remoteUrl: SURGERY_TEAM },
      ],
    },
    attachments: [
      { name: 'Meniscal Repair Kit Instructions for Use', fileBase: 'meniscal-repair-kit-ifu' },
      { name: 'Meniscal Repair Kit Arthroscopic Technique Guide', fileBase: 'meniscal-repair-kit-technique-guide' },
      { name: 'Meniscal Repair Kit Instrument Reference List', fileBase: 'meniscal-repair-kit-instrument-list' },
    ],
  },
  {
    solutionSlug: 'sports-medicine',
    spu: 'HY-SM-300',
    slug: 'bio-ligament-tape',
    badgeText: 'Augmentation · Absorbable',
    name: 'Bio-Ligament Tape',
    shortDescription:
      'Bio-Ligament Tape is a flat braided augmentation implant for ligament reconstruction and joint stabilization in dogs and cats. The wide load-bearing profile spreads tension over a broader footprint than round suture, reducing the tissue cut-through seen in soft-tissue fixation. Absorbable and non-absorbable constructions are available, letting the surgeon choose between temporary support during remodeling and permanent stabilization.',
    extraText: 'Tape width 2/4 mm · Tensile ≥400 N · Absorbable or UHMWPE · Low tissue cut-through · EO sterile · 24-month shelf life',
    descriptionHtml: `<p><strong>Bio-Ligament Tape</strong> is the augmentation component of the sports-medicine line. Round suture concentrates load on a narrow line of tissue, and in soft-tissue fixation that concentration is the usual origin of cut-through and early loss of tension. A flat braided tape spreads the same load over a wider footprint, which is why tape constructs have largely displaced round suture for ligament augmentation.</p>
<p>Two constructions share the same handling. The UHMWPE tape provides permanent stabilization for revision work and cases where biological healing is unlikely to restore load capacity. The absorbable construction carries the joint through the remodeling window and then resorbs over 6 to 12 months, leaving native tissue to take over. Both are supplied in 2 mm and 4 mm widths with a tensile rating of 400 N or greater.</p>
<h3>Features</h3>
<ul>
<li><strong>Load-spreading profile.</strong> The flat braid distributes tension across a wider tissue footprint to reduce cut-through.</li>
<li><strong>Absorbable or permanent.</strong> Matched geometry in two materials lets the surgeon select the support duration per case.</li>
<li><strong>High tensile rating.</strong> Tested at 400 N or greater, sized for canine stifle and tarsal stabilization loads.</li>
<li><strong>Anchor compatible.</strong> Works with the Stifle Anchor Pro implant set as a single reconstruction system.</li>
</ul>
<h3>Indications</h3>
<ul>
<li>Ligament augmentation during CCL reconstruction</li>
<li>Medial patellar luxation soft-tissue stabilization</li>
<li>Tarsal and carpal collateral ligament support</li>
<li>Joint stabilization following traumatic luxation</li>
</ul>
<h3>Regulatory</h3>
<ul>
<li>Manufactured under an ISO 13485 quality management system</li>
<li>CE marked for the European market</li>
<li>Biological evaluation completed to ISO 10993 for implanted material</li>
<li>Ethylene oxide sterilization validated to ISO 11135; 24-month shelf life</li>
</ul>`,
    stats: [
      { label: 'Tape widths', value: '2 mm / 4 mm' },
      { label: 'Tensile strength', value: '≥ 400 N' },
      { label: 'Materials', value: 'UHMWPE / absorbable PGA composite' },
      { label: 'Absorbable resorption window', value: '6 – 12 months' },
      { label: 'Construction', value: 'Flat braided load-spreading tape' },
      { label: 'Anchor compatibility', value: 'Stifle Anchor Pro 3.5 / 4.5 mm' },
      { label: 'Target patient weight', value: '3 kg – 40 kg' },
      { label: 'Sterilization', value: 'Ethylene oxide (ISO 11135)' },
      { label: 'Shelf life', value: '24 months' },
      { label: 'Certifications', value: 'ISO 13485, ISO 10993, CE' },
    ],
    seoTitle: 'Bio-Ligament Tape Augmentation Implant | Hongyu Medical',
    seoDescription:
      'Bio-Ligament Tape is a flat braided veterinary ligament augmentation implant in 2 mm and 4 mm widths, available in absorbable and UHMWPE constructions with tensile strength above 400 N and reduced tissue cut-through.',
    imageSources: {
      cover: { localFile: 'sol-feature2.jpg', remoteUrl: LAB_BENCH },
      gallery: [
        { localFile: 'sol-feature3.jpg', remoteUrl: MICROSCOPE },
        { localFile: 'sol-clinical.jpg', remoteUrl: SURGICAL_OR },
      ],
    },
    attachments: [
      { name: 'Bio-Ligament Tape Instructions for Use', fileBase: 'bio-ligament-tape-ifu' },
      { name: 'Bio-Ligament Tape Material Data Sheet', fileBase: 'bio-ligament-tape-material-data' },
      { name: 'Bio-Ligament Tape Tensile Test Report', fileBase: 'bio-ligament-tape-tensile-report' },
    ],
  },

  /* ───── Cardiac Pacemaker ───── */
  {
    solutionSlug: 'pacemaker',
    spu: 'HY-PM-100',
    slug: 'pace-vet-single',
    badgeText: 'Clinical trial · Single chamber',
    name: 'PaceVet Single',
    shortDescription:
      'PaceVet Single is a single-chamber implantable pulse generator developed specifically for cats and small dogs. The 11 g titanium can reduces pocket tension in patients where human-derived generators are simply too large, and the lithium-iodine power system projects beyond eight years at typical veterinary pacing outputs. The device is currently in multi-center clinical trials for sick sinus syndrome and high-grade AV block.',
    extraText: 'Mass 11 g · Single chamber VVI · Battery 8 yr+ · Lead <500 Ω · Wireless programmer · In clinical trial',
    descriptionHtml: `<p><strong>PaceVet Single</strong> is a single-chamber implantable pulse generator built for companion-animal rhythm management. Veterinary cardiology has long depended on explanted or donated human generators, which are sized for a human pectoral pocket and programmed for human output requirements. In a 4 kg cat, that mismatch shows up as pocket tension, wound complications, and battery capacity spent on outputs the patient never needed.</p>
<p>This device starts from the veterinary constraint. The can weighs 11 g, the steroid-eluting bipolar lead is specified below 500 Ω to keep capture thresholds stable, and the projected longevity exceeds eight years at typical veterinary pacing outputs. Follow-up runs through a wireless veterinary programmer designed for in-clinic interrogation without sedation. Animal studies are complete and the device is in multi-center clinical trials.</p>
<h3>Features</h3>
<ul>
<li><strong>Miniaturized generator.</strong> An 11 g can reduces pocket tension in cats and toy-breed dogs.</li>
<li><strong>Long-life power system.</strong> Lithium-iodine chemistry projects beyond eight years at typical veterinary outputs.</li>
<li><strong>Low-impedance lead.</strong> Steroid-eluting bipolar electrodes are designed to hold chronic capture thresholds stable.</li>
<li><strong>Wireless programming.</strong> In-clinic interrogation and reprogramming without repositioning the patient.</li>
</ul>
<h3>Indications</h3>
<ul>
<li>Sick sinus syndrome with sinus pauses or chronotropic incompetence (trial indication)</li>
<li>High-grade and complete atrioventricular block (trial indication)</li>
<li>Symptomatic bradyarrhythmia in dogs and cats from 2 kg to 18 kg</li>
</ul>
<h3>Regulatory</h3>
<ul>
<li>Animal studies complete; multi-center clinical trial in progress across eight centers</li>
<li>Not yet commercially released; investigational use only</li>
<li>MRI conditionality under evaluation</li>
<li>Manufactured under an ISO 13485 quality management system</li>
</ul>`,
    stats: [
      { label: 'Device class', value: 'Implantable pulse generator' },
      { label: 'Pacing mode', value: 'Single chamber (VVI)' },
      { label: 'Generator mass', value: '11 g' },
      { label: 'Projected battery life', value: '8 years+' },
      { label: 'Battery chemistry', value: 'Lithium-iodine' },
      { label: 'Lead impedance', value: '< 500 Ω' },
      { label: 'Lead type', value: 'Steroid-eluting bipolar' },
      { label: 'Target patient weight', value: '2 kg – 18 kg' },
      { label: 'Programmer', value: 'Wireless veterinary programmer' },
      { label: 'Regulatory status', value: 'Multi-center clinical trial' },
    ],
    seoTitle: 'PaceVet Single Chamber Veterinary Pacemaker | Hongyu Medical',
    seoDescription:
      'PaceVet Single is an 11 g single-chamber implantable pacemaker for cats and small dogs, with a lithium-iodine battery projected beyond eight years, low-impedance steroid-eluting leads, and wireless programming. In multi-center clinical trials.',
    imageSources: {
      cover: { localFile: 'sol-feature2.jpg', remoteUrl: LAB_COATS },
      gallery: [
        { localFile: 'sol-feature1.jpg', remoteUrl: HEART_MODEL },
        { localFile: 'sol-overview.jpg', remoteUrl: LAB_BENCH },
      ],
    },
    attachments: [
      { name: 'PaceVet Single Investigator Brochure', fileBase: 'pace-vet-single-investigator-brochure' },
      { name: 'PaceVet Single Technical Specification Sheet', fileBase: 'pace-vet-single-spec-sheet' },
      { name: 'PaceVet Single Implant Technique Guide', fileBase: 'pace-vet-single-implant-guide' },
    ],
  },
  {
    solutionSlug: 'pacemaker',
    spu: 'HY-PM-200',
    slug: 'pace-vet-dual',
    badgeText: 'Clinical trial · Dual chamber',
    name: 'PaceVet Dual',
    shortDescription:
      'PaceVet Dual is a dual-chamber implantable pulse generator that preserves atrioventricular synchrony in dogs with intact sinus function and conduction block. Rate-responsive DDD pacing maintains physiological chamber timing, which matters for exercise tolerance in working and sporting breeds. The 14 g can and dual low-impedance lead set are in multi-center clinical trials alongside the single-chamber model.',
    extraText: 'Mass 14 g · Dual chamber DDD/DDDR · Battery 7 yr+ · Dual bipolar leads · Wireless programmer · In clinical trial',
    descriptionHtml: `<p><strong>PaceVet Dual</strong> extends the PaceVet platform to dual-chamber pacing. Single-chamber ventricular pacing restores rate but discards atrioventricular synchrony, and in a patient with intact sinus node function that loss costs measurable cardiac output. For working dogs and sporting breeds where exercise tolerance is the clinical endpoint that owners actually notice, preserving chamber timing is the difference the device is meant to deliver.</p>
<p>The generator supports DDD and rate-responsive DDDR modes through a paired atrial and ventricular lead set, both steroid-eluting bipolar designs below 500 Ω. The can weighs 14 g, a modest increase over the single-chamber model that reflects the additional header and circuitry. Projected longevity exceeds seven years at typical veterinary dual-chamber outputs. The device is investigational and enrolled in the same multi-center trial program.</p>
<h3>Features</h3>
<ul>
<li><strong>Atrioventricular synchrony.</strong> DDD and DDDR modes maintain physiological chamber timing rather than pacing the ventricle alone.</li>
<li><strong>Rate responsiveness.</strong> Sensor-driven rate adaptation supports exercise tolerance in active patients.</li>
<li><strong>Dual low-impedance leads.</strong> Paired steroid-eluting bipolar atrial and ventricular electrodes below 500 Ω.</li>
<li><strong>Compact dual-chamber can.</strong> At 14 g the generator remains implantable in medium-breed dogs.</li>
</ul>
<h3>Indications</h3>
<ul>
<li>High-grade AV block with preserved sinus node function (trial indication)</li>
<li>Complete atrioventricular block in dogs requiring synchrony (trial indication)</li>
<li>Bradyarrhythmia in active or working dogs where exercise tolerance is the primary endpoint</li>
</ul>
<h3>Regulatory</h3>
<ul>
<li>Animal studies complete; multi-center clinical trial in progress</li>
<li>Not yet commercially released; investigational use only</li>
<li>MRI conditionality under evaluation</li>
<li>Manufactured under an ISO 13485 quality management system</li>
</ul>`,
    stats: [
      { label: 'Device class', value: 'Implantable pulse generator' },
      { label: 'Pacing modes', value: 'Dual chamber (DDD / DDDR)' },
      { label: 'Generator mass', value: '14 g' },
      { label: 'Projected battery life', value: '7 years+' },
      { label: 'Battery chemistry', value: 'Lithium-iodine' },
      { label: 'Lead impedance', value: '< 500 Ω (both leads)' },
      { label: 'Lead set', value: 'Atrial + ventricular steroid-eluting bipolar' },
      { label: 'Target patient weight', value: '5 kg – 35 kg' },
      { label: 'Programmer', value: 'Wireless veterinary programmer' },
      { label: 'Regulatory status', value: 'Multi-center clinical trial' },
    ],
    seoTitle: 'PaceVet Dual Chamber Veterinary Pacemaker | Hongyu Medical',
    seoDescription:
      'PaceVet Dual is a 14 g dual-chamber veterinary pacemaker supporting DDD and rate-responsive DDDR pacing to preserve atrioventricular synchrony in dogs, with paired low-impedance steroid-eluting leads. In multi-center clinical trials.',
    imageSources: {
      cover: { localFile: 'sol-feature1.jpg', remoteUrl: HEART_MODEL },
      gallery: [
        { localFile: 'sol-feature2.jpg', remoteUrl: LAB_COATS },
        { localFile: 'sol-clinical.jpg', remoteUrl: SURGERY_TEAM },
      ],
    },
    attachments: [
      { name: 'PaceVet Dual Investigator Brochure', fileBase: 'pace-vet-dual-investigator-brochure' },
      { name: 'PaceVet Dual Technical Specification Sheet', fileBase: 'pace-vet-dual-spec-sheet' },
      { name: 'PaceVet Dual Programming Reference', fileBase: 'pace-vet-dual-programming-reference' },
    ],
  },
  {
    solutionSlug: 'pacemaker',
    spu: 'HY-PM-300',
    slug: 'wireless-holter-pro',
    badgeText: 'Diagnostics · Ambulatory ECG',
    name: 'Wireless Holter Pro',
    shortDescription:
      'Wireless Holter Pro is a wearable ambulatory ECG recorder for arrhythmia workup and pacemaker follow-up in dogs and cats. The 48 g harness-mounted unit records three channels continuously for up to seven days, streaming to a clinic dashboard so a cardiologist can review events without recalling the patient. It is the diagnostic front end for the PaceVet implant program.',
    extraText: '3-channel ECG · 7-day recording · 48 g wearable · 1000 Hz sampling · Wireless sync · Reusable',
    descriptionHtml: `<p><strong>Wireless Holter Pro</strong> is the diagnostic companion to the PaceVet implant line. Intermittent bradyarrhythmia is easy to miss on a clinic ECG lasting a few minutes, and the decision to implant a pacemaker rests on catching those events. This recorder extends the observation window to seven continuous days on a harness-mounted unit that a patient tolerates at home.</p>
<p>Three ECG channels are sampled at 1000 Hz and stored on-device, with wireless sync to a clinic dashboard for review. The same workflow serves post-implant follow-up: pacing capture, sensing behavior, and rate response can be assessed under normal daily activity rather than in the artificial setting of an examination room. The unit is reusable across patients with replaceable electrode pads.</p>
<h3>Features</h3>
<ul>
<li><strong>Seven-day continuous recording.</strong> Extends the observation window far past what a clinic ECG can capture.</li>
<li><strong>Three-channel acquisition.</strong> 1000 Hz sampling across three channels supports morphology assessment, not just rate.</li>
<li><strong>Wireless clinic sync.</strong> Recorded data uploads to a dashboard so a cardiologist reviews events without recalling the patient.</li>
<li><strong>Patient-tolerated form factor.</strong> At 48 g the harness-mounted unit is wearable by cats and small dogs at home.</li>
</ul>
<h3>Indications</h3>
<ul>
<li>Workup of suspected intermittent bradyarrhythmia and syncope</li>
<li>Pre-implant assessment for pacemaker candidacy</li>
<li>Post-implant follow-up of pacing capture and rate response</li>
<li>Antiarrhythmic therapy monitoring</li>
</ul>
<h3>Regulatory</h3>
<ul>
<li>Veterinary diagnostic device; no implanted components</li>
<li>Manufactured under an ISO 13485 quality management system</li>
<li>Electrical safety and EMC tested to IEC 60601 series</li>
<li>Reusable unit with single-use replaceable electrode pads</li>
</ul>`,
    stats: [
      { label: 'Device class', value: 'Ambulatory ECG recorder' },
      { label: 'ECG channels', value: '3' },
      { label: 'Sampling rate', value: '1000 Hz' },
      { label: 'Continuous recording window', value: 'Up to 7 days' },
      { label: 'Unit mass', value: '48 g' },
      { label: 'Mounting', value: 'Harness-mounted wearable' },
      { label: 'Data transfer', value: 'Wireless sync to clinic dashboard' },
      { label: 'Target species', value: 'Dogs and cats' },
      { label: 'Reusability', value: 'Reusable unit, replaceable pads' },
      { label: 'Compliance', value: 'ISO 13485, IEC 60601 series' },
    ],
    seoTitle: 'Wireless Holter Pro Veterinary Ambulatory ECG | Hongyu Medical',
    seoDescription:
      'Wireless Holter Pro is a 48 g wearable veterinary Holter recorder capturing three ECG channels at 1000 Hz for up to seven days, with wireless clinic sync for arrhythmia workup and pacemaker follow-up in dogs and cats.',
    imageSources: {
      cover: { localFile: 'sol-feature3.jpg', remoteUrl: MED_DEVICE },
      gallery: [
        { localFile: 'sol-clinical.jpg', remoteUrl: VET_CLINIC },
        { localFile: 'sol-feature2.jpg', remoteUrl: LAB_COATS },
      ],
    },
    attachments: [
      { name: 'Wireless Holter Pro User Manual', fileBase: 'wireless-holter-pro-user-manual' },
      { name: 'Wireless Holter Pro Technical Specification Sheet', fileBase: 'wireless-holter-pro-spec-sheet' },
      { name: 'Wireless Holter Pro Data Review Workflow', fileBase: 'wireless-holter-pro-data-workflow' },
    ],
  },

  /* ───── R&D Products (in research) ───── */
  {
    solutionSlug: 'in-research',
    spu: 'HY-RD-100',
    slug: 'optical-nav-beta',
    badgeText: 'Research · Concept validation',
    name: 'Optical Nav Beta',
    shortDescription:
      'Optical Nav Beta is a research-stage surgical navigation platform using marker-based optical tracking to guide corrective osteotomy and implant placement in dogs. The system targets sub-millimeter registration error against pre-operative CT, with the aim of replacing freehand angular estimation in complex limb deformity correction. It is in concept validation at four partner sites and is not commercially available.',
    extraText: 'Optical tracking · Target <1 mm registration · CT-based planning · 4 validation sites · Research use only',
    descriptionHtml: `<p><strong>Optical Nav Beta</strong> is a research-stage navigation platform for veterinary orthopedics. Corrective osteotomy for angular limb deformity currently depends on pre-operative measurement plus freehand execution, and the gap between planned and achieved correction is a known source of revision surgery. The program asks whether marker-based optical tracking, already routine in human spine and joint work, can be adapted to the smaller anatomy and tighter budgets of veterinary practice.</p>
<p>The system registers a pre-operative CT plan to the intraoperative limb through rigidly fixed optical markers, then tracks instrument position against that plan in real time. The target is registration error below 1 mm. Concept validation is running at four partner sites through benchtop phantoms and cadaver labs. No clinical claim is made, and the platform is shared publicly so research partners can follow the work.</p>
<h3>Features</h3>
<ul>
<li><strong>Marker-based optical tracking.</strong> Rigidly fixed reference markers tie the intraoperative limb to the pre-operative plan.</li>
<li><strong>CT-based planning.</strong> Osteotomy angles and implant trajectories are defined pre-operatively and tracked during execution.</li>
<li><strong>Sub-millimeter accuracy target.</strong> The program specification is registration error below 1 mm.</li>
<li><strong>Veterinary-scale hardware.</strong> Marker arrays and workflow are sized for canine limb anatomy and clinic budgets.</li>
</ul>
<h3>Indications</h3>
<ul>
<li>Corrective osteotomy guidance for angular limb deformity (research)</li>
<li>Implant trajectory alignment in complex fracture repair (research)</li>
<li>Cadaver-lab training and surgical planning validation</li>
</ul>
<h3>Regulatory</h3>
<ul>
<li>Research use only; not a commercial product and not for clinical decision-making</li>
<li>Concept validation stage at four partner sites</li>
<li>Pre-clinical documentation in progress</li>
<li>No regulatory clearance sought at this stage</li>
</ul>`,
    stats: [
      { label: 'Development stage', value: 'Concept validation' },
      { label: 'Tracking modality', value: 'Marker-based optical' },
      { label: 'Target registration error', value: '< 1 mm' },
      { label: 'Planning input', value: 'Pre-operative CT' },
      { label: 'Validation sites', value: '4' },
      { label: 'Intended species', value: 'Dogs' },
      { label: 'Primary research application', value: 'Corrective osteotomy guidance' },
      { label: 'Regulatory path', value: 'Pre-clinical documentation in progress' },
      { label: 'Availability', value: 'Research use only' },
    ],
    seoTitle: 'Optical Nav Beta Surgical Navigation Research | Hongyu Medical',
    seoDescription:
      'Optical Nav Beta is a research-stage veterinary surgical navigation platform using marker-based optical tracking and pre-operative CT planning to target sub-millimeter registration for corrective osteotomy in dogs.',
    imageSources: {
      cover: { localFile: 'sol-feature3.jpg', remoteUrl: MICROSCOPE },
      gallery: [
        { localFile: 'sol-feature1.jpg', remoteUrl: MED_DEVICE },
        { localFile: 'sol-overview.jpg', remoteUrl: LAB_BENCH },
      ],
    },
    attachments: [
      { name: 'Optical Nav Beta Research Overview', fileBase: 'optical-nav-beta-research-overview' },
      { name: 'Optical Nav Beta Accuracy Validation Report', fileBase: 'optical-nav-beta-accuracy-report' },
      { name: 'Optical Nav Beta Partner Site Protocol', fileBase: 'optical-nav-beta-site-protocol' },
    ],
  },
  {
    solutionSlug: 'in-research',
    spu: 'HY-RD-200',
    slug: 'plga-mesh-alpha',
    badgeText: 'Research · Animal studies complete',
    name: 'PLGA Mesh Alpha',
    shortDescription:
      'PLGA Mesh Alpha is a research-stage bioabsorbable surgical mesh built on a PLGA composite with a predictable 6 to 12 month degradation window. It is intended for soft-tissue reinforcement where a permanent implant is undesirable, such as body-wall closure in growing animals. Animal studies are complete and the program is preparing pre-clinical documentation; the material is not commercially available.',
    extraText: 'PLGA composite · Degradation 6–12 months · Tensile ≥18 N/cm · Animal studies complete · Research use only',
    descriptionHtml: `<p><strong>PLGA Mesh Alpha</strong> is the materials-science program in the Hongyu research portfolio. Permanent synthetic mesh performs well for adult body-wall reinforcement but is a poor fit where the patient is still growing or where long-term foreign material raises infection and adhesion risk. A mesh that provides mechanical support through the healing window and then disappears on a predictable schedule addresses both problems.</p>
<p>The construction is a PLGA-based composite tuned for a 6 to 12 month degradation window, matched to the timeline over which native collagen remodeling restores load capacity. Tensile strength is specified at 18 N/cm or greater at implantation. Animal studies are complete, with degradation kinetics and host response characterized, and the program is now assembling pre-clinical documentation. No clinical use is authorized.</p>
<h3>Features</h3>
<ul>
<li><strong>Predictable degradation.</strong> The PLGA composite is tuned to resorb over 6 to 12 months rather than persisting indefinitely.</li>
<li><strong>Healing-window support.</strong> Tensile strength of 18 N/cm or greater at implantation carries load until native tissue remodels.</li>
<li><strong>Characterized host response.</strong> Animal studies document degradation kinetics and local tissue reaction.</li>
<li><strong>Growth-friendly.</strong> Absence of a permanent implant suits body-wall repair in growing animals.</li>
</ul>
<h3>Indications</h3>
<ul>
<li>Body-wall and hernia reinforcement in growing animals (research)</li>
<li>Soft-tissue closure adjunct where permanent mesh is undesirable (research)</li>
<li>Absorbable scaffold studies for tissue reinforcement</li>
</ul>
<h3>Regulatory</h3>
<ul>
<li>Research use only; not a commercial product</li>
<li>Animal studies complete; degradation and host response characterized</li>
<li>Pre-clinical documentation in progress</li>
<li>No regulatory clearance sought at this stage</li>
</ul>`,
    stats: [
      { label: 'Development stage', value: 'Animal studies complete' },
      { label: 'Base material', value: 'PLGA-based composite' },
      { label: 'Degradation window', value: '6 – 12 months' },
      { label: 'Tensile strength at implantation', value: '≥ 18 N/cm' },
      { label: 'Construction', value: 'Knitted absorbable mesh' },
      { label: 'Intended species', value: 'Dogs and cats' },
      { label: 'Primary research application', value: 'Body-wall reinforcement' },
      { label: 'Regulatory path', value: 'Pre-clinical documentation in progress' },
      { label: 'Availability', value: 'Research use only' },
    ],
    seoTitle: 'PLGA Mesh Alpha Bioabsorbable Mesh Research | Hongyu Medical',
    seoDescription:
      'PLGA Mesh Alpha is a research-stage bioabsorbable veterinary surgical mesh built on a PLGA composite with a 6 to 12 month degradation window and tensile strength above 18 N/cm. Animal studies complete; research use only.',
    imageSources: {
      cover: { localFile: 'sol-feature2.jpg', remoteUrl: LAB_BENCH },
      gallery: [
        { localFile: 'sol-feature3.jpg', remoteUrl: MICROSCOPE },
        { localFile: 'sol-overview.jpg', remoteUrl: LAB_COATS },
      ],
    },
    attachments: [
      { name: 'PLGA Mesh Alpha Research Overview', fileBase: 'plga-mesh-alpha-research-overview' },
      { name: 'PLGA Mesh Alpha Degradation Study Report', fileBase: 'plga-mesh-alpha-degradation-report' },
      { name: 'PLGA Mesh Alpha Material Characterization Data', fileBase: 'plga-mesh-alpha-material-data' },
    ],
  },
  {
    solutionSlug: 'in-research',
    spu: 'HY-RD-300',
    slug: 'ai-imaging-assist',
    badgeText: 'Research · Model development',
    name: 'AI Imaging Assist',
    shortDescription:
      'AI Imaging Assist is a research-stage software module that triages canine and feline radiographs and ultrasound studies to help busy hospitals prioritize review. Models flag candidate findings on thoracic and abdominal studies and rank studies by urgency; they do not produce a diagnosis. The module is in model development and is offered only for research collaboration, not clinical decision-making.',
    extraText: 'Radiograph + ultrasound triage · Thoracic & abdominal models · DICOM input · Research use only · No diagnostic claim',
    descriptionHtml: `<p><strong>AI Imaging Assist</strong> is the software program in the Hongyu research portfolio. The problem it targets is throughput rather than accuracy: a high-volume hospital may generate more imaging studies in a day than a single clinician can review promptly, and the studies that need attention first are not always the ones that arrive first. A triage model that ranks studies by likely urgency changes which case a clinician opens next.</p>
<p>The module ingests DICOM radiograph and ultrasound studies, flags candidate findings on thoracic and abdominal views, and returns an urgency ranking with region-level heat maps for transparency. It is explicitly not a diagnostic device. No output should be treated as a finding without clinician review, and the module is offered for research collaboration only while model development and validation continue.</p>
<h3>Features</h3>
<ul>
<li><strong>Urgency triage.</strong> Studies are ranked so a clinician can choose which case to review first.</li>
<li><strong>Thoracic and abdominal models.</strong> Separate models cover the two highest-volume radiographic study types.</li>
<li><strong>DICOM-native input.</strong> Integrates with standard veterinary imaging output without manual export.</li>
<li><strong>Explainable output.</strong> Region-level heat maps accompany each flag so a reviewer can see what drove it.</li>
</ul>
<h3>Indications</h3>
<ul>
<li>Research triage of thoracic and abdominal radiographs (research)</li>
<li>Ultrasound study prioritization in high-volume hospitals (research)</li>
<li>Retrospective dataset review and model validation studies</li>
</ul>
<h3>Regulatory</h3>
<ul>
<li>Research use only; not a diagnostic device and not for clinical decision-making</li>
<li>Model development and validation ongoing</li>
<li>No diagnostic performance claim is made at this stage</li>
<li>Available to research collaborators under data-use agreement</li>
</ul>`,
    stats: [
      { label: 'Development stage', value: 'Model development' },
      { label: 'Modalities', value: 'Radiograph, ultrasound' },
      { label: 'Model coverage', value: 'Thoracic and abdominal studies' },
      { label: 'Input format', value: 'DICOM' },
      { label: 'Primary output', value: 'Urgency ranking with heat maps' },
      { label: 'Diagnostic claim', value: 'None; triage support only' },
      { label: 'Intended species', value: 'Dogs and cats' },
      { label: 'Access model', value: 'Research collaboration under data-use agreement' },
      { label: 'Availability', value: 'Research use only' },
    ],
    seoTitle: 'AI Imaging Assist Veterinary Triage Research | Hongyu Medical',
    seoDescription:
      'AI Imaging Assist is a research-stage veterinary imaging triage module that ranks canine and feline radiograph and ultrasound studies by urgency with explainable heat maps. Research use only; no diagnostic claim.',
    imageSources: {
      cover: { localFile: 'sol-feature1.jpg', remoteUrl: MED_DEVICE },
      gallery: [
        { localFile: 'sol-feature3.jpg', remoteUrl: MICROSCOPE },
        { localFile: 'sol-clinical.jpg', remoteUrl: VET_CLINIC },
      ],
    },
    attachments: [
      { name: 'AI Imaging Assist Research Overview', fileBase: 'ai-imaging-assist-research-overview' },
      { name: 'AI Imaging Assist Model Validation Report', fileBase: 'ai-imaging-assist-validation-report' },
      { name: 'AI Imaging Assist Data Use Agreement Template', fileBase: 'ai-imaging-assist-data-use-agreement' },
    ],
  },
];

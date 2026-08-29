/**
 * Seed academy certificates and courses (English).
 * Run upload-academy-covers.ts first when R2 is configured.
 *
 * Usage: pnpm exec tsx scripts/seed-academy.ts
 */
import '@/lib/env';

import { eq } from 'drizzle-orm';

import { db } from '@/server/db';
import {
  academyCertificateCourses,
  academyCertificateTranslations,
  academyCertificates,
  academyCourseTranslations,
  academyCourses,
} from '@/server/db/schema';

const LOCALE = 'en';

type CourseSeed = {
  slug: string;
  coverKey: string;
  teacherCount: number;
  studentCount: number;
  title: string;
  summary: string;
  description: string;
  stats: Array<{ label: string; value: string }>;
  learnings: string[];
  skills: string[];
  tools: string[];
};

type CertificateSeed = {
  slug: string;
  coverKey: string;
  teacherCount: number;
  studentCount: number;
  title: string;
  summary: string;
  description: string;
  stats: Array<{ label: string; value: string }>;
  learnings: string[];
  skills: string[];
  tools: string[];
  courseSlugs: string[];
};

const COURSES: CourseSeed[] = [
  {
    slug: 'small-animal-internal-medicine',
    coverKey: 'academy/courses/small-animal-internal-medicine.jpg',
    teacherCount: 4,
    studentCount: 12800,
    title: 'Small Animal Internal Medicine Fundamentals',
    summary: 'Build a strong foundation in diagnosing and managing common internal medicine cases in dogs and cats.',
    description: '<p>Master the core principles of small animal internal medicine, from history-taking and physical examination to diagnostic planning and treatment protocols for common companion animal diseases.</p>',
    stats: [{ label: 'Modules', value: '5' }, { label: 'Level', value: 'Beginner' }, { label: 'Duration', value: '4 weeks' }],
    learnings: ['Interpret CBC and chemistry panels', 'Develop differential diagnosis lists', 'Manage chronic disease cases'],
    skills: ['Clinical reasoning', 'Diagnostic planning', 'Patient communication'],
    tools: ['Case study templates', 'Lab reference guides', 'Treatment checklists'],
  },
  {
    slug: 'canine-feline-imaging',
    coverKey: 'academy/courses/canine-feline-imaging.jpg',
    teacherCount: 3,
    studentCount: 9600,
    title: 'Canine and Feline Diagnostic Imaging',
    summary: 'Learn radiographic and ultrasound interpretation skills for small animal practice.',
    description: '<p>Develop practical imaging skills through guided case reviews covering thoracic, abdominal, and musculoskeletal radiographs plus introductory ultrasound patterns.</p>',
    stats: [{ label: 'Modules', value: '4' }, { label: 'Level', value: 'Intermediate' }, { label: 'Duration', value: '3 weeks' }],
    learnings: ['Read thoracic radiographs', 'Identify common ultrasound findings', 'Choose appropriate imaging modalities'],
    skills: ['Radiograph interpretation', 'Ultrasound basics', 'Imaging workflow'],
    tools: ['DICOM viewers', 'Image annotation tools', 'Case libraries'],
  },
  {
    slug: 'clinical-nutrition-basics',
    coverKey: 'academy/courses/clinical-nutrition-basics.jpg',
    teacherCount: 2,
    studentCount: 7400,
    title: 'Clinical Nutrition for Companion Animals',
    summary: 'Apply evidence-based nutrition strategies for wellness, weight management, and therapeutic diets.',
    description: '<p>Understand macronutrient requirements, diet selection, and client counseling techniques for nutritional management across life stages.</p>',
    stats: [{ label: 'Modules', value: '4' }, { label: 'Level', value: 'Beginner' }, { label: 'Duration', value: '3 weeks' }],
    learnings: ['Calculate energy requirements', 'Recommend therapeutic diets', 'Counsel pet owners on feeding'],
    skills: ['Nutritional assessment', 'Diet formulation', 'Client education'],
    tools: ['Calorie calculators', 'Diet comparison charts', 'Feeding plan templates'],
  },
  {
    slug: 'veterinary-anesthesia',
    coverKey: 'academy/courses/veterinary-anesthesia.jpg',
    teacherCount: 3,
    studentCount: 8200,
    title: 'Veterinary Anesthesia and Analgesia',
    summary: 'Safe anesthesia protocols and pain management for small animal surgical patients.',
    description: '<p>Cover pre-anesthetic assessment, drug selection, monitoring, and perioperative analgesia with emphasis on patient safety and team communication.</p>',
    stats: [{ label: 'Modules', value: '5' }, { label: 'Level', value: 'Intermediate' }, { label: 'Duration', value: '4 weeks' }],
    learnings: ['Design anesthesia protocols', 'Monitor anesthetized patients', 'Manage postoperative pain'],
    skills: ['Anesthetic planning', 'Patient monitoring', 'Crisis response'],
    tools: ['Protocol builders', 'Monitoring checklists', 'Drug dose calculators'],
  },
  {
    slug: 'soft-tissue-surgery',
    coverKey: 'academy/courses/soft-tissue-surgery.jpg',
    teacherCount: 5,
    studentCount: 6700,
    title: 'Soft Tissue Surgery Essentials',
    summary: 'Core surgical principles and common soft tissue procedures for general practice.',
    description: '<p>From aseptic technique and suturing patterns to spay/neuter refinements and exploratory laparotomy decision-making.</p>',
    stats: [{ label: 'Modules', value: '6' }, { label: 'Level', value: 'Advanced' }, { label: 'Duration', value: '5 weeks' }],
    learnings: ['Apply aseptic technique', 'Perform common soft tissue procedures', 'Manage surgical complications'],
    skills: ['Suturing', 'Surgical planning', 'Postoperative care'],
    tools: ['Suture guides', 'Surgical video library', 'Complication protocols'],
  },
  {
    slug: 'emergency-critical-care',
    coverKey: 'academy/courses/emergency-critical-care.jpg',
    teacherCount: 4,
    studentCount: 5900,
    title: 'Emergency and Critical Care for Small Animals',
    summary: 'Stabilize emergency patients and manage critical care workflows in busy practices.',
    description: '<p>Focus on triage, shock recognition, fluid therapy, and team-based emergency response for dogs and cats.</p>',
    stats: [{ label: 'Modules', value: '4' }, { label: 'Level', value: 'Intermediate' }, { label: 'Duration', value: '3 weeks' }],
    learnings: ['Perform rapid triage', 'Initiate fluid resuscitation', 'Coordinate emergency teams'],
    skills: ['Triage', 'Critical care monitoring', 'Emergency protocols'],
    tools: ['Triage algorithms', 'Fluid therapy calculators', 'Emergency drug charts'],
  },
  {
    slug: 'advanced-diagnostic-imaging',
    coverKey: 'academy/courses/advanced-diagnostic-imaging.jpg',
    teacherCount: 3,
    studentCount: 4300,
    title: 'Advanced Diagnostic Imaging',
    summary: 'Deep dive into complex imaging cases and multimodal diagnostic approaches.',
    description: '<p>Advance your imaging interpretation with challenging cases spanning MRI concepts, advanced ultrasound, and integrative diagnostic planning.</p>',
    stats: [{ label: 'Modules', value: '5' }, { label: 'Level', value: 'Advanced' }, { label: 'Duration', value: '4 weeks' }],
    learnings: ['Interpret complex imaging cases', 'Integrate multimodal diagnostics', 'Communicate imaging findings'],
    skills: ['Advanced interpretation', 'Case integration', 'Referral communication'],
    tools: ['Advanced case atlas', 'Reporting templates', 'Multimodal workflows'],
  },
  {
    slug: 'therapeutic-nutrition',
    coverKey: 'academy/courses/therapeutic-nutrition.jpg',
    teacherCount: 2,
    studentCount: 5100,
    title: 'Therapeutic Nutrition and Diet Therapy',
    summary: 'Manage disease-specific nutritional therapy for renal, GI, and metabolic conditions.',
    description: '<p>Learn to prescribe and monitor therapeutic diets for chronic diseases with practical owner communication strategies.</p>',
    stats: [{ label: 'Modules', value: '4' }, { label: 'Level', value: 'Intermediate' }, { label: 'Duration', value: '3 weeks' }],
    learnings: ['Select renal and GI diets', 'Monitor nutritional therapy outcomes', 'Adjust diets for comorbidities'],
    skills: ['Therapeutic diet selection', 'Outcome monitoring', 'Long-term counseling'],
    tools: ['Therapeutic diet matrix', 'Monitoring logs', 'Owner handouts'],
  },
  {
    slug: 'minimally-invasive-surgery',
    coverKey: 'academy/courses/minimally-invasive-surgery.jpg',
    teacherCount: 4,
    studentCount: 3800,
    title: 'Minimally Invasive Surgery Introduction',
    summary: 'Introduction to laparoscopic and minimally invasive surgical techniques in veterinary practice.',
    description: '<p>Explore equipment setup, basic laparoscopic skills, and patient selection for minimally invasive procedures.</p>',
    stats: [{ label: 'Modules', value: '4' }, { label: 'Level', value: 'Advanced' }, { label: 'Duration', value: '4 weeks' }],
    learnings: ['Set up laparoscopic equipment', 'Perform basic laparoscopic maneuvers', 'Select appropriate MIS candidates'],
    skills: ['Laparoscopic technique', 'Equipment handling', 'Surgical decision-making'],
    tools: ['Equipment setup guides', 'Simulation exercises', 'Case selection criteria'],
  },
];

const CERTIFICATES: CertificateSeed[] = [
  {
    slug: 'small-animal-clinical',
    coverKey: 'academy/certificates/small-animal-clinical.jpg',
    teacherCount: 8,
    studentCount: 24500,
    title: 'Small Animal Clinical Practice Professional Certificate',
    summary: 'A comprehensive certificate program covering internal medicine, emergency care, and clinical decision-making for companion animals.',
    description: '<p>Designed for veterinary professionals seeking structured training in small animal clinical practice. Complete three core courses and earn a professional certificate recognized by HONGYU Medical Academy.</p>',
    stats: [{ label: 'Courses', value: '3' }, { label: 'Rating', value: '4.8' }, { label: 'Level', value: 'Professional' }, { label: 'Duration', value: '3 months' }],
    learnings: ['Manage common clinical cases', 'Apply evidence-based protocols', 'Improve diagnostic accuracy'],
    skills: ['Clinical practice', 'Emergency care', 'Internal medicine'],
    tools: ['Clinical pathways', 'Case libraries', 'Practice assessments'],
    courseSlugs: ['small-animal-internal-medicine', 'emergency-critical-care', 'clinical-nutrition-basics'],
  },
  {
    slug: 'veterinary-imaging',
    coverKey: 'academy/certificates/veterinary-imaging.jpg',
    teacherCount: 5,
    studentCount: 18200,
    title: 'Veterinary Imaging Certification',
    summary: 'Build expertise in diagnostic imaging from fundamentals to advanced interpretation.',
    description: '<p>Progress through imaging fundamentals and advanced case-based learning to earn certification in veterinary diagnostic imaging.</p>',
    stats: [{ label: 'Courses', value: '2' }, { label: 'Rating', value: '4.7' }, { label: 'Level', value: 'Professional' }, { label: 'Duration', value: '2 months' }],
    learnings: ['Interpret radiographs and ultrasound', 'Plan multimodal imaging workups', 'Report imaging findings clearly'],
    skills: ['Diagnostic imaging', 'Case interpretation', 'Clinical communication'],
    tools: ['Image case banks', 'Reporting frameworks', 'Modality guides'],
    courseSlugs: ['canine-feline-imaging', 'advanced-diagnostic-imaging'],
  },
  {
    slug: 'pet-nutrition-health',
    coverKey: 'academy/certificates/pet-nutrition-health.jpg',
    teacherCount: 4,
    studentCount: 15600,
    title: 'Pet Nutrition and Health Management Certificate',
    summary: 'Specialized training in companion animal nutrition for wellness and disease management.',
    description: '<p>Learn to counsel clients and implement nutrition programs that support long-term health outcomes in dogs and cats.</p>',
    stats: [{ label: 'Courses', value: '2' }, { label: 'Rating', value: '4.9' }, { label: 'Level', value: 'Professional' }, { label: 'Duration', value: '2 months' }],
    learnings: ['Assess nutritional needs', 'Design therapeutic feeding plans', 'Support chronic disease management'],
    skills: ['Nutrition counseling', 'Diet therapy', 'Wellness planning'],
    tools: ['Nutrition calculators', 'Client education kits', 'Therapeutic diet guides'],
    courseSlugs: ['clinical-nutrition-basics', 'therapeutic-nutrition'],
  },
  {
    slug: 'veterinary-surgery',
    coverKey: 'academy/certificates/veterinary-surgery.jpg',
    teacherCount: 6,
    studentCount: 13400,
    title: 'Advanced Veterinary Surgery Certificate',
    summary: 'Advance your surgical skills from soft tissue essentials to minimally invasive techniques.',
    description: '<p>An intensive surgical certificate for veterinarians ready to expand procedural confidence and perioperative care excellence.</p>',
    stats: [{ label: 'Courses', value: '2' }, { label: 'Rating', value: '4.8' }, { label: 'Level', value: 'Advanced' }, { label: 'Duration', value: '2 months' }],
    learnings: ['Perform soft tissue procedures', 'Apply anesthesia best practices', 'Introduce MIS techniques'],
    skills: ['Surgery', 'Anesthesia', 'Perioperative care'],
    tools: ['Surgical atlases', 'Anesthesia protocols', 'MIS training modules'],
    courseSlugs: ['veterinary-anesthesia', 'soft-tissue-surgery', 'minimally-invasive-surgery'],
  },
];

async function upsertCourse(course: CourseSeed, sortOrder: number) {
  const [existing] = await db.select().from(academyCourses).where(eq(academyCourses.slug, course.slug)).limit(1);
  let courseId = existing?.id;
  if (!existing) {
    const [inserted] = await db.insert(academyCourses).values({
      slug: course.slug,
      status: 'published',
      sortOrder,
      coverMode: 'upload',
      coverValue: course.coverKey,
      teacherCount: course.teacherCount,
      studentCount: course.studentCount,
      publishedAt: new Date(),
    }).returning({ id: academyCourses.id });
    courseId = inserted.id;
  } else {
    await db.update(academyCourses).set({
      status: 'published',
      sortOrder,
      coverMode: 'upload',
      coverValue: course.coverKey,
      teacherCount: course.teacherCount,
      studentCount: course.studentCount,
      publishedAt: existing.publishedAt ?? new Date(),
      updatedAt: new Date(),
    }).where(eq(academyCourses.id, existing.id));
    courseId = existing.id;
  }

  const translationPayload = {
    title: course.title,
    summary: course.summary,
    description: course.description,
    seoTitle: course.title,
    seoDescription: course.summary,
    stats: course.stats,
    learnings: course.learnings,
    skills: course.skills,
    tools: course.tools,
    updatedAt: new Date(),
  };
  const enTranslation = await db.select().from(academyCourseTranslations)
    .where(eq(academyCourseTranslations.courseId, courseId))
    .then((rows) => rows.find((row) => row.locale === LOCALE));
  if (enTranslation) {
    await db.update(academyCourseTranslations).set(translationPayload).where(eq(academyCourseTranslations.id, enTranslation.id));
  } else {
    await db.insert(academyCourseTranslations).values({
      courseId,
      locale: LOCALE,
      ...translationPayload,
    });
  }
  return courseId;
}

async function upsertCertificate(certificate: CertificateSeed, sortOrder: number, courseIdBySlug: Map<string, string>) {
  const [existing] = await db.select().from(academyCertificates).where(eq(academyCertificates.slug, certificate.slug)).limit(1);
  let certificateId = existing?.id;
  if (!existing) {
    const [inserted] = await db.insert(academyCertificates).values({
      slug: certificate.slug,
      status: 'published',
      sortOrder,
      coverMode: 'upload',
      coverValue: certificate.coverKey,
      teacherCount: certificate.teacherCount,
      studentCount: certificate.studentCount,
      publishedAt: new Date(),
    }).returning({ id: academyCertificates.id });
    certificateId = inserted.id;
  } else {
    await db.update(academyCertificates).set({
      status: 'published',
      sortOrder,
      coverMode: 'upload',
      coverValue: certificate.coverKey,
      teacherCount: certificate.teacherCount,
      studentCount: certificate.studentCount,
      publishedAt: existing.publishedAt ?? new Date(),
      updatedAt: new Date(),
    }).where(eq(academyCertificates.id, existing.id));
    certificateId = existing.id;
  }

  const enTranslation = await db.select().from(academyCertificateTranslations)
    .where(eq(academyCertificateTranslations.certificateId, certificateId))
    .then((rows) => rows.find((row) => row.locale === LOCALE));
  const translationPayload = {
    title: certificate.title,
    summary: certificate.summary,
    description: certificate.description,
    seoTitle: certificate.title,
    seoDescription: certificate.summary,
    stats: certificate.stats,
    learnings: certificate.learnings,
    skills: certificate.skills,
    tools: certificate.tools,
    updatedAt: new Date(),
  };
  if (enTranslation) {
    await db.update(academyCertificateTranslations).set(translationPayload).where(eq(academyCertificateTranslations.id, enTranslation.id));
  } else {
    await db.insert(academyCertificateTranslations).values({
      certificateId,
      locale: LOCALE,
      ...translationPayload,
    });
  }

  await db.delete(academyCertificateCourses).where(eq(academyCertificateCourses.certificateId, certificateId));
  const links = certificate.courseSlugs
    .map((slug, index) => {
      const courseId = courseIdBySlug.get(slug);
      if (!courseId) return null;
      return { certificateId, courseId, sortOrder: (index + 1) * 10 };
    })
    .filter((item): item is { certificateId: string; courseId: string; sortOrder: number } => Boolean(item));
  if (links.length) await db.insert(academyCertificateCourses).values(links);
}

export async function seedAcademy() {
  const courseIdBySlug = new Map<string, string>();
  for (const [index, course] of COURSES.entries()) {
    const id = await upsertCourse(course, (index + 1) * 10);
    courseIdBySlug.set(course.slug, id);
  }
  for (const [index, certificate] of CERTIFICATES.entries()) {
    await upsertCertificate(certificate, (index + 1) * 10, courseIdBySlug);
  }
  console.log('[seed-academy] Seeded academy certificates and courses.');
}

seedAcademy()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[seed-academy] Failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  });

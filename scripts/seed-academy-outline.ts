/**
 * Seed academy units + lessons for every course using R2 video pool from
 * upload-academy-lesson-videos.ts (scripts/data/academy-lesson-videos.json).
 *
 * Usage: pnpm exec tsx scripts/seed-academy-outline.ts
 */
import '@/lib/env';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { asc, eq } from 'drizzle-orm';

import { db } from '@/server/db';
import {
  academyCourses,
  academyLessonTranslations,
  academyLessons,
  academyUnitTranslations,
  academyUnits,
} from '@/server/db/schema';

const LOCALE = 'en';

type ManifestItem = {
  key: string;
  pexelsId: number;
  durationSeconds: number;
  bytes: number;
};

type LessonSeed = {
  key: string;
  title: string;
  description: string;
};

type UnitSeed = {
  key: string;
  title: string;
  lessons: LessonSeed[];
};

const OUTLINES: Record<string, UnitSeed[]> = {
  'small-animal-internal-medicine': [
    {
      key: 'foundations',
      title: 'Clinical Foundations',
      lessons: [
        { key: 'history-exam', title: 'History Taking and Physical Exam', description: 'Structured approaches to gathering history and performing a thorough small animal physical examination.' },
        { key: 'problem-list', title: 'Building Problem Lists', description: 'Translate clinical findings into prioritized problem lists that guide diagnostics.' },
      ],
    },
    {
      key: 'diagnostics',
      title: 'Core Diagnostics',
      lessons: [
        { key: 'lab-panels', title: 'Interpreting CBC and Chemistry', description: 'Pattern recognition for common laboratory abnormalities in dogs and cats.' },
        { key: 'case-walkthrough', title: 'Internal Medicine Case Walkthrough', description: 'Work through a representative internal medicine case from presentation to plan.' },
      ],
    },
  ],
  'canine-feline-imaging': [
    {
      key: 'radiography',
      title: 'Radiography Essentials',
      lessons: [
        { key: 'thoracic-rad', title: 'Thoracic Radiograph Patterns', description: 'Identify pulmonary, cardiac, and mediastinal patterns on thoracic films.' },
        { key: 'abd-rad', title: 'Abdominal Radiograph Review', description: 'Systematic abdominal radiograph interpretation for general practice.' },
      ],
    },
    {
      key: 'ultrasound',
      title: 'Ultrasound Basics',
      lessons: [
        { key: 'us-intro', title: 'Introduction to Point-of-Care Ultrasound', description: 'Probe selection, orientation, and basic abdominal windows.' },
        { key: 'us-cases', title: 'Ultrasound Case Practice', description: 'Apply ultrasound findings to common clinical presentations.' },
      ],
    },
  ],
  'clinical-nutrition-basics': [
    {
      key: 'nutrient-basics',
      title: 'Nutrient Fundamentals',
      lessons: [
        { key: 'macros', title: 'Energy and Macronutrients', description: 'Calculate energy needs and balance proteins, fats, and carbohydrates.' },
        { key: 'life-stages', title: 'Life-Stage Feeding Plans', description: 'Nutrition strategies for growth, adult maintenance, and senior pets.' },
      ],
    },
    {
      key: 'client-counsel',
      title: 'Client Counseling',
      lessons: [
        { key: 'diet-select', title: 'Diet Selection Conversations', description: 'Help clients choose commercial diets with confidence.' },
        { key: 'weight-mgmt', title: 'Weight Management Coaching', description: 'Design practical weight-loss plans clients can follow.' },
      ],
    },
  ],
  'veterinary-anesthesia': [
    {
      key: 'preanes',
      title: 'Pre-Anesthetic Planning',
      lessons: [
        { key: 'risk-assess', title: 'Patient Risk Assessment', description: 'ASA status, comorbidities, and drug selection considerations.' },
        { key: 'protocols', title: 'Protocol Design Workshop', description: 'Build balanced anesthesia protocols for common procedures.' },
      ],
    },
    {
      key: 'monitoring',
      title: 'Monitoring and Recovery',
      lessons: [
        { key: 'vitals', title: 'Intraoperative Monitoring', description: 'Interpret ECG, SpO2, ETCO2, and blood pressure trends.' },
        { key: 'pain', title: 'Perioperative Analgesia', description: 'Multimodal pain management from induction through recovery.' },
      ],
    },
  ],
  'soft-tissue-surgery': [
    {
      key: 'asepsis',
      title: 'Surgical Foundations',
      lessons: [
        { key: 'aseptic', title: 'Aseptic Technique Refresh', description: 'OR setup, draping, and infection control habits that matter.' },
        { key: 'sutures', title: 'Suture Patterns in Practice', description: 'Common suture materials and patterns for soft tissue closure.' },
      ],
    },
    {
      key: 'procedures',
      title: 'Core Procedures',
      lessons: [
        { key: 'spayneuter', title: 'Spay and Neuter Refinements', description: 'Efficiency and safety tips for high-volume soft tissue surgery.' },
        { key: 'explore', title: 'Exploratory Laparotomy Decisions', description: 'When to explore, what to sample, and how to document findings.' },
      ],
    },
  ],
  'emergency-critical-care': [
    {
      key: 'triage',
      title: 'Triage and Stabilization',
      lessons: [
        { key: 'rapid-triage', title: 'Rapid Triage Workflow', description: 'ABC assessment and team roles in the first five minutes.' },
        { key: 'shock', title: 'Recognizing and Treating Shock', description: 'Classify shock types and initiate appropriate fluid therapy.' },
      ],
    },
    {
      key: 'critical',
      title: 'Critical Care Basics',
      lessons: [
        { key: 'fluids', title: 'Fluid Therapy in Emergencies', description: 'Crystalloids, colloids, and monitoring response to volume.' },
        { key: 'team', title: 'Emergency Team Communication', description: 'Closed-loop communication during high-acuity cases.' },
      ],
    },
  ],
  'advanced-diagnostic-imaging': [
    {
      key: 'advanced-patterns',
      title: 'Advanced Pattern Recognition',
      lessons: [
        { key: 'complex-cases', title: 'Complex Imaging Cases', description: 'Work through multimodal imaging puzzles with clinical correlation.' },
        { key: 'reporting', title: 'Imaging Report Clarity', description: 'Write concise, actionable imaging reports for referring clinicians.' },
      ],
    },
    {
      key: 'multimodal',
      title: 'Multimodal Diagnostics',
      lessons: [
        { key: 'integrate', title: 'Integrating Imaging Modalities', description: 'Decide when radiographs, ultrasound, CT, or MRI add value.' },
      ],
    },
  ],
  'therapeutic-nutrition': [
    {
      key: 'disease-diets',
      title: 'Disease-Specific Diets',
      lessons: [
        { key: 'renal', title: 'Renal Nutrition Strategies', description: 'Phosphorus, protein, and hydration considerations in CKD.' },
        { key: 'gi', title: 'GI Therapeutic Diets', description: 'Select diets for acute and chronic gastrointestinal disease.' },
      ],
    },
    {
      key: 'metabolic',
      title: 'Metabolic Conditions',
      lessons: [
        { key: 'diabetes', title: 'Nutrition in Diabetes Mellitus', description: 'Feeding plans that support glycemic control.' },
      ],
    },
  ],
  'minimally-invasive-surgery': [
    {
      key: 'mis-intro',
      title: 'MIS Fundamentals',
      lessons: [
        { key: 'setup', title: 'Laparoscopy Setup and Ergonomics', description: 'Tower setup, ports, and surgeon positioning for MIS.' },
        { key: 'indications', title: 'MIS Indications and Case Selection', description: 'Choose candidates who benefit most from minimally invasive approaches.' },
      ],
    },
    {
      key: 'skills',
      title: 'Core MIS Skills',
      lessons: [
        { key: 'skills-lab', title: 'Basic Instrument Handling', description: 'Camera navigation and instrument triangulation drills.' },
      ],
    },
  ],
};

function defaultOutline(courseSlug: string): UnitSeed[] {
  return [
    {
      key: 'unit-1',
      title: 'Getting Started',
      lessons: [
        { key: 'intro', title: `${courseSlug} Introduction`, description: 'Course overview and learning goals.' },
        { key: 'practice', title: 'Guided Practice', description: 'Apply core concepts with a short practice case.' },
      ],
    },
    {
      key: 'unit-2',
      title: 'Applied Skills',
      lessons: [
        { key: 'clinic', title: 'Clinic Application', description: 'Bring skills into everyday clinical workflows.' },
        { key: 'wrap', title: 'Unit Wrap-up', description: 'Review key takeaways and next steps.' },
      ],
    },
  ];
}

async function main() {
  const manifestPath = path.join(process.cwd(), 'scripts', 'data', 'academy-lesson-videos.json');
  const raw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw) as ManifestItem[];
  if (!manifest.length) throw new Error('academy-lesson-videos.json is empty — run upload-academy-lesson-videos.ts first');

  const courses = await db.select().from(academyCourses).orderBy(asc(academyCourses.sortOrder), asc(academyCourses.slug));
  if (!courses.length) throw new Error('No academy courses found — run seed-academy.ts first');

  let videoCursor = 0;
  const nextVideo = () => {
    const item = manifest[videoCursor % manifest.length]!;
    videoCursor += 1;
    return item;
  };

  for (const course of courses) {
    const outline = OUTLINES[course.slug] ?? defaultOutline(course.slug);
    console.log(`[outline] Seeding ${course.slug} (${outline.length} units)`);

    const existingUnits = await db.select().from(academyUnits).where(eq(academyUnits.courseId, course.id));
    for (const unit of existingUnits) {
      await db.delete(academyUnits).where(eq(academyUnits.id, unit.id));
    }

    for (const [unitIndex, unitSeed] of outline.entries()) {
      const [unit] = await db
        .insert(academyUnits)
        .values({
          courseId: course.id,
          sortOrder: (unitIndex + 1) * 10,
          coverImage: '',
          coverMode: '',
          coverValue: '',
        })
        .returning();

      await db.insert(academyUnitTranslations).values({
        unitId: unit.id,
        locale: LOCALE,
        title: unitSeed.title,
      });

      for (const [lessonIndex, lessonSeed] of unitSeed.lessons.entries()) {
        const video = nextVideo();
        const [lesson] = await db
          .insert(academyLessons)
          .values({
            unitId: unit.id,
            sortOrder: (lessonIndex + 1) * 10,
            videoUrl: video.key,
            durationSeconds: video.durationSeconds,
          })
          .returning();

        await db.insert(academyLessonTranslations).values({
          lessonId: lesson.id,
          locale: LOCALE,
          title: lessonSeed.title,
          description: lessonSeed.description,
        });
      }
    }
  }

  console.log('[outline] Done.');
}

main().catch((error) => {
  console.error('[outline] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});

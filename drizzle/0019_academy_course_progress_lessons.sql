-- Course progress: lesson-based completion counts
ALTER TABLE "academy_certificate_course_progress"
  ADD COLUMN IF NOT EXISTS "completed_lesson_count" integer DEFAULT 0 NOT NULL;

ALTER TABLE "academy_certificate_course_progress"
  ADD COLUMN IF NOT EXISTS "total_lesson_count" integer DEFAULT 0 NOT NULL;

ALTER TABLE "academy_certificate_course_progress"
  ADD COLUMN IF NOT EXISTS "progress_percent" integer DEFAULT 0 NOT NULL;

ALTER TABLE "academy_certificate_course_progress"
  ADD COLUMN IF NOT EXISTS "unit_id" uuid;

ALTER TABLE "academy_certificate_course_progress"
  ADD COLUMN IF NOT EXISTS "lesson_id" uuid;

ALTER TABLE "academy_certificate_course_progress"
  ADD COLUMN IF NOT EXISTS "position_seconds" integer DEFAULT 0 NOT NULL;

DO $$ BEGIN
  ALTER TABLE "academy_certificate_course_progress"
    ADD CONSTRAINT "academy_certificate_course_progress_unit_id_fk"
    FOREIGN KEY ("unit_id") REFERENCES "public"."academy_units"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "academy_certificate_course_progress"
    ADD CONSTRAINT "academy_certificate_course_progress_lesson_id_fk"
    FOREIGN KEY ("lesson_id") REFERENCES "public"."academy_lessons"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "academy_exam_attempts"
  ADD COLUMN IF NOT EXISTS "certificate_course_id" uuid;

ALTER TABLE "academy_user_certificates"
  ADD COLUMN IF NOT EXISTS "certificate_course_id" uuid;

UPDATE "academy_exam_attempts" AS attempt
SET "certificate_course_id" = link.id
FROM "academy_certificate_courses" AS link
WHERE attempt.course_id = link.course_id
  AND attempt.certificate_course_id IS NULL
  AND (
    SELECT COUNT(*) FROM "academy_certificate_courses" AS only_link
    WHERE only_link.course_id = attempt.course_id
  ) = 1;

UPDATE "academy_user_certificates" AS earned
SET "certificate_course_id" = attempt.certificate_course_id
FROM "academy_exam_attempts" AS attempt
WHERE earned.attempt_id = attempt.id
  AND earned.certificate_course_id IS NULL
  AND attempt.certificate_course_id IS NOT NULL;

UPDATE "academy_user_certificates" AS earned
SET "certificate_course_id" = link.id
FROM "academy_certificate_courses" AS link
WHERE earned.course_id = link.course_id
  AND earned.certificate_course_id IS NULL
  AND (
    SELECT COUNT(*) FROM "academy_certificate_courses" AS only_link
    WHERE only_link.course_id = earned.course_id
  ) = 1;

DELETE FROM "academy_exam_attempts"
WHERE "certificate_course_id" IS NULL;

DELETE FROM "academy_user_certificates"
WHERE "certificate_course_id" IS NULL;

ALTER TABLE "academy_exam_attempts"
  ALTER COLUMN "certificate_course_id" SET NOT NULL;

ALTER TABLE "academy_user_certificates"
  ALTER COLUMN "certificate_course_id" SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE "academy_exam_attempts"
    ADD CONSTRAINT "academy_exam_attempts_certificate_course_id_fk"
    FOREIGN KEY ("certificate_course_id") REFERENCES "public"."academy_certificate_courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "academy_user_certificates"
    ADD CONSTRAINT "academy_user_certificates_certificate_course_id_fk"
    FOREIGN KEY ("certificate_course_id") REFERENCES "public"."academy_certificate_courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "academy_exam_attempts_user_link_idx"
  ON "academy_exam_attempts" ("user_id", "certificate_course_id");

CREATE INDEX IF NOT EXISTS "academy_user_certificates_link_idx"
  ON "academy_user_certificates" ("certificate_course_id");

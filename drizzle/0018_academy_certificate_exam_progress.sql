-- Certificate-level question banks
CREATE TABLE IF NOT EXISTS "academy_certificate_question_banks" (
  "certificate_id" uuid NOT NULL,
  "question_bank_id" uuid NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "academy_certificate_question_banks_pk" PRIMARY KEY("certificate_id","question_bank_id")
);

DO $$ BEGIN
  ALTER TABLE "academy_certificate_question_banks"
    ADD CONSTRAINT "academy_certificate_question_banks_certificate_id_fk"
    FOREIGN KEY ("certificate_id") REFERENCES "public"."academy_certificates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "academy_certificate_question_banks"
    ADD CONSTRAINT "academy_certificate_question_banks_question_bank_id_fk"
    FOREIGN KEY ("question_bank_id") REFERENCES "public"."academy_question_banks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "academy_certificate_question_banks_certificate_id_idx"
  ON "academy_certificate_question_banks" ("certificate_id");
CREATE INDEX IF NOT EXISTS "academy_certificate_question_banks_bank_id_idx"
  ON "academy_certificate_question_banks" ("question_bank_id");

-- Migrate course question banks -> certificate question banks
INSERT INTO "academy_certificate_question_banks" ("certificate_id", "question_bank_id", "sort_order")
SELECT DISTINCT link.certificate_id, cqb.question_bank_id, cqb.sort_order
FROM "academy_course_question_banks" AS cqb
INNER JOIN "academy_certificate_courses" AS link ON link.course_id = cqb.course_id
ON CONFLICT ("certificate_id", "question_bank_id") DO NOTHING;

-- Certificate-level user progress
CREATE TABLE IF NOT EXISTS "academy_certificate_progress" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "certificate_id" uuid NOT NULL,
  "completed_course_count" integer DEFAULT 0 NOT NULL,
  "total_course_count" integer DEFAULT 0 NOT NULL,
  "progress_percent" integer DEFAULT 0 NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "academy_certificate_progress"
    ADD CONSTRAINT "academy_certificate_progress_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "academy_certificate_progress"
    ADD CONSTRAINT "academy_certificate_progress_certificate_id_fk"
    FOREIGN KEY ("certificate_id") REFERENCES "public"."academy_certificates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "academy_certificate_progress_user_certificate_unique"
  ON "academy_certificate_progress" ("user_id", "certificate_id");
CREATE INDEX IF NOT EXISTS "academy_certificate_progress_user_updated_idx"
  ON "academy_certificate_progress" ("user_id", "updated_at" DESC);

-- Exam attempts: add certificate_id, migrate, drop old columns
ALTER TABLE "academy_exam_attempts"
  ADD COLUMN IF NOT EXISTS "certificate_id" uuid;

UPDATE "academy_exam_attempts" AS attempt
SET "certificate_id" = link.certificate_id
FROM "academy_certificate_courses" AS link
WHERE attempt.certificate_course_id = link.id
  AND attempt.certificate_id IS NULL;

DELETE FROM "academy_exam_attempts"
WHERE "certificate_id" IS NULL;

ALTER TABLE "academy_exam_attempts"
  ALTER COLUMN "certificate_id" SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE "academy_exam_attempts"
    ADD CONSTRAINT "academy_exam_attempts_certificate_id_fk"
    FOREIGN KEY ("certificate_id") REFERENCES "public"."academy_certificates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP INDEX IF EXISTS "academy_exam_attempts_user_course_idx";
DROP INDEX IF EXISTS "academy_exam_attempts_user_link_idx";

ALTER TABLE "academy_exam_attempts" DROP CONSTRAINT IF EXISTS "academy_exam_attempts_course_id_fk";
ALTER TABLE "academy_exam_attempts" DROP CONSTRAINT IF EXISTS "academy_exam_attempts_certificate_course_id_fk";
ALTER TABLE "academy_exam_attempts" DROP COLUMN IF EXISTS "course_id";
ALTER TABLE "academy_exam_attempts" DROP COLUMN IF EXISTS "certificate_course_id";

CREATE INDEX IF NOT EXISTS "academy_exam_attempts_user_certificate_idx"
  ON "academy_exam_attempts" ("user_id", "certificate_id");

-- User certificates: add certificate_id, migrate, dedupe, drop old columns
ALTER TABLE "academy_user_certificates"
  ADD COLUMN IF NOT EXISTS "certificate_id" uuid;

UPDATE "academy_user_certificates" AS earned
SET "certificate_id" = link.certificate_id
FROM "academy_certificate_courses" AS link
WHERE earned.certificate_course_id = link.id
  AND earned.certificate_id IS NULL;

DELETE FROM "academy_user_certificates"
WHERE "certificate_id" IS NULL;

-- Keep best passed cert per user+certificate
DELETE FROM "academy_user_certificates" AS dup
USING "academy_user_certificates" AS keep
INNER JOIN "academy_exam_attempts" AS keep_attempt ON keep_attempt.id = keep.attempt_id
WHERE dup.user_id = keep.user_id
  AND dup.certificate_id = keep.certificate_id
  AND dup.id <> keep.id
  AND keep_attempt.passed = true
  AND (
    dup.id NOT IN (
      SELECT sub.id
      FROM "academy_user_certificates" AS sub
      INNER JOIN "academy_exam_attempts" AS sub_attempt ON sub_attempt.id = sub.attempt_id
      WHERE sub.user_id = keep.user_id
        AND sub.certificate_id = keep.certificate_id
        AND sub_attempt.passed = true
      ORDER BY sub_attempt.score DESC NULLS LAST, sub.issued_at DESC
      LIMIT 1
    )
  );

ALTER TABLE "academy_user_certificates"
  ALTER COLUMN "certificate_id" SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE "academy_user_certificates"
    ADD CONSTRAINT "academy_user_certificates_certificate_id_fk"
    FOREIGN KEY ("certificate_id") REFERENCES "public"."academy_certificates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP INDEX IF EXISTS "academy_user_certificates_course_id_idx";
DROP INDEX IF EXISTS "academy_user_certificates_link_idx";

ALTER TABLE "academy_user_certificates" DROP CONSTRAINT IF EXISTS "academy_user_certificates_course_id_fk";
ALTER TABLE "academy_user_certificates" DROP CONSTRAINT IF EXISTS "academy_user_certificates_certificate_course_id_fk";
ALTER TABLE "academy_user_certificates" DROP COLUMN IF EXISTS "course_id";
ALTER TABLE "academy_user_certificates" DROP COLUMN IF EXISTS "certificate_course_id";

CREATE UNIQUE INDEX IF NOT EXISTS "academy_user_certificates_user_certificate_unique"
  ON "academy_user_certificates" ("user_id", "certificate_id");
CREATE INDEX IF NOT EXISTS "academy_user_certificates_certificate_id_idx"
  ON "academy_user_certificates" ("certificate_id");

-- Drop old course question banks table
DROP TABLE IF EXISTS "academy_course_question_banks";

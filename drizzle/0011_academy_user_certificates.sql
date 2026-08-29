ALTER TABLE "academy_exam_attempts"
  ADD COLUMN IF NOT EXISTS "certificate_mail_status" varchar(16) DEFAULT 'unsent' NOT NULL;
ALTER TABLE "academy_exam_attempts"
  ADD COLUMN IF NOT EXISTS "certificate_mail_file" text;
ALTER TABLE "academy_exam_attempts"
  ADD COLUMN IF NOT EXISTS "certificate_mail_updated_at" timestamptz;

CREATE TABLE IF NOT EXISTS "academy_user_certificates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "course_id" uuid NOT NULL,
  "attempt_id" uuid NOT NULL,
  "certificate_number" varchar(64) NOT NULL,
  "recipient_name" varchar(255) DEFAULT '' NOT NULL,
  "title" varchar(255) DEFAULT '' NOT NULL,
  "issuer_name" varchar(255) DEFAULT '上海竑宇医疗' NOT NULL,
  "issued_at" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "academy_user_certificates"
    ADD CONSTRAINT "academy_user_certificates_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "academy_user_certificates"
    ADD CONSTRAINT "academy_user_certificates_course_id_fk"
    FOREIGN KEY ("course_id") REFERENCES "public"."academy_courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "academy_user_certificates"
    ADD CONSTRAINT "academy_user_certificates_attempt_id_fk"
    FOREIGN KEY ("attempt_id") REFERENCES "public"."academy_exam_attempts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "academy_user_certificates_attempt_id_unique"
  ON "academy_user_certificates" ("attempt_id");
CREATE UNIQUE INDEX IF NOT EXISTS "academy_user_certificates_number_unique"
  ON "academy_user_certificates" ("certificate_number");
CREATE INDEX IF NOT EXISTS "academy_user_certificates_user_id_idx"
  ON "academy_user_certificates" ("user_id");
CREATE INDEX IF NOT EXISTS "academy_user_certificates_course_id_idx"
  ON "academy_user_certificates" ("course_id");

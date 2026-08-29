DO $$ BEGIN
  CREATE TYPE "academy_question_type" AS ENUM('single_choice', 'multiple_choice', 'true_false', 'fill_blank');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "academy_question_banks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "time_limit_minutes" integer,
  "max_retakes" integer,
  "pass_score_percent" integer DEFAULT 60 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "academy_question_banks_i18n" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "question_bank_id" uuid NOT NULL,
  "locale" varchar(16) NOT NULL,
  "title" varchar(255) DEFAULT '' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "academy_questions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "question_bank_id" uuid NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "question_type" "academy_question_type" NOT NULL,
  "score" integer DEFAULT 1 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "academy_questions_i18n" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "question_id" uuid NOT NULL,
  "locale" varchar(16) NOT NULL,
  "content" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "academy_course_question_banks" (
  "course_id" uuid NOT NULL,
  "question_bank_id" uuid NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "academy_course_question_banks_pk" PRIMARY KEY("course_id","question_bank_id")
);

CREATE TABLE IF NOT EXISTS "academy_exam_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "course_id" uuid NOT NULL,
  "question_bank_id" uuid NOT NULL,
  "started_at" timestamptz DEFAULT now() NOT NULL,
  "submitted_at" timestamptz,
  "score" integer,
  "total_score" integer,
  "passed" boolean,
  "answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "academy_question_banks_i18n"
    ADD CONSTRAINT "academy_question_banks_i18n_bank_id_fk"
    FOREIGN KEY ("question_bank_id") REFERENCES "public"."academy_question_banks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "academy_questions"
    ADD CONSTRAINT "academy_questions_bank_id_fk"
    FOREIGN KEY ("question_bank_id") REFERENCES "public"."academy_question_banks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "academy_questions_i18n"
    ADD CONSTRAINT "academy_questions_i18n_question_id_fk"
    FOREIGN KEY ("question_id") REFERENCES "public"."academy_questions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "academy_course_question_banks"
    ADD CONSTRAINT "academy_course_question_banks_course_id_fk"
    FOREIGN KEY ("course_id") REFERENCES "public"."academy_courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "academy_course_question_banks"
    ADD CONSTRAINT "academy_course_question_banks_bank_id_fk"
    FOREIGN KEY ("question_bank_id") REFERENCES "public"."academy_question_banks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "academy_exam_attempts"
    ADD CONSTRAINT "academy_exam_attempts_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "academy_exam_attempts"
    ADD CONSTRAINT "academy_exam_attempts_course_id_fk"
    FOREIGN KEY ("course_id") REFERENCES "public"."academy_courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "academy_exam_attempts"
    ADD CONSTRAINT "academy_exam_attempts_bank_id_fk"
    FOREIGN KEY ("question_bank_id") REFERENCES "public"."academy_question_banks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "academy_question_banks_i18n_bank_locale_unique"
  ON "academy_question_banks_i18n" ("question_bank_id", "locale");
CREATE INDEX IF NOT EXISTS "academy_question_banks_i18n_bank_id_idx"
  ON "academy_question_banks_i18n" ("question_bank_id");

CREATE INDEX IF NOT EXISTS "academy_questions_bank_sort_idx"
  ON "academy_questions" ("question_bank_id", "sort_order");
CREATE UNIQUE INDEX IF NOT EXISTS "academy_questions_i18n_question_locale_unique"
  ON "academy_questions_i18n" ("question_id", "locale");
CREATE INDEX IF NOT EXISTS "academy_questions_i18n_question_id_idx"
  ON "academy_questions_i18n" ("question_id");

CREATE INDEX IF NOT EXISTS "academy_course_question_banks_course_id_idx"
  ON "academy_course_question_banks" ("course_id");
CREATE INDEX IF NOT EXISTS "academy_course_question_banks_bank_id_idx"
  ON "academy_course_question_banks" ("question_bank_id");

CREATE INDEX IF NOT EXISTS "academy_exam_attempts_user_course_idx"
  ON "academy_exam_attempts" ("user_id", "course_id");
CREATE INDEX IF NOT EXISTS "academy_exam_attempts_user_id_idx"
  ON "academy_exam_attempts" ("user_id");

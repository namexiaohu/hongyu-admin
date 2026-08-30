ALTER TABLE "academy_certificate_courses"
  ADD COLUMN IF NOT EXISTS "id" uuid;

UPDATE "academy_certificate_courses"
SET "id" = gen_random_uuid()
WHERE "id" IS NULL;

ALTER TABLE "academy_certificate_courses"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "academy_certificate_courses"
  ALTER COLUMN "id" SET NOT NULL;

ALTER TABLE "academy_certificate_courses"
  DROP CONSTRAINT IF EXISTS "academy_certificate_courses_pkey";

ALTER TABLE "academy_certificate_courses"
  ADD PRIMARY KEY ("id");

CREATE UNIQUE INDEX IF NOT EXISTS "academy_certificate_courses_certificate_course_unique"
  ON "academy_certificate_courses" ("certificate_id", "course_id");

CREATE TABLE IF NOT EXISTS "academy_certificate_views" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "certificate_id" uuid NOT NULL,
  "viewed_at" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "academy_certificate_views"
    ADD CONSTRAINT "academy_certificate_views_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "academy_certificate_views"
    ADD CONSTRAINT "academy_certificate_views_certificate_id_fk"
    FOREIGN KEY ("certificate_id") REFERENCES "public"."academy_certificates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "academy_certificate_views_user_certificate_unique"
  ON "academy_certificate_views" ("user_id", "certificate_id");
CREATE INDEX IF NOT EXISTS "academy_certificate_views_user_viewed_idx"
  ON "academy_certificate_views" ("user_id", "viewed_at" DESC);

CREATE TABLE IF NOT EXISTS "academy_course_views" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "course_id" uuid NOT NULL,
  "viewed_at" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "academy_course_views"
    ADD CONSTRAINT "academy_course_views_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "academy_course_views"
    ADD CONSTRAINT "academy_course_views_course_id_fk"
    FOREIGN KEY ("course_id") REFERENCES "public"."academy_courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "academy_course_views_user_course_unique"
  ON "academy_course_views" ("user_id", "course_id");
CREATE INDEX IF NOT EXISTS "academy_course_views_user_viewed_idx"
  ON "academy_course_views" ("user_id", "viewed_at" DESC);

CREATE TABLE IF NOT EXISTS "academy_certificate_course_progress" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "certificate_course_id" uuid NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "academy_certificate_course_progress"
    ADD CONSTRAINT "academy_certificate_course_progress_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "academy_certificate_course_progress"
    ADD CONSTRAINT "academy_certificate_course_progress_link_id_fk"
    FOREIGN KEY ("certificate_course_id") REFERENCES "public"."academy_certificate_courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "academy_certificate_course_progress_user_link_unique"
  ON "academy_certificate_course_progress" ("user_id", "certificate_course_id");
CREATE INDEX IF NOT EXISTS "academy_certificate_course_progress_user_updated_idx"
  ON "academy_certificate_course_progress" ("user_id", "updated_at" DESC);

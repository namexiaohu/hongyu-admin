-- 0011_surgeons: Certified Surgeons tables
DO $$ BEGIN
  CREATE TYPE "surgeon_grade_key" AS ENUM ('platinum', 'gold', 'silver');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "surgeons" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug"       varchar(64)  NOT NULL,
  "avatar"     text         NOT NULL DEFAULT '',
  "grade_key"  surgeon_grade_key NOT NULL DEFAULT 'silver',
  "sort_order" integer      NOT NULL DEFAULT 0,
  "created_at" timestamptz  NOT NULL DEFAULT now(),
  "updated_at" timestamptz  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "surgeons_slug_unique" ON "surgeons" ("slug");
CREATE INDEX IF NOT EXISTS "surgeons_sort_idx" ON "surgeons" ("sort_order");

CREATE TABLE IF NOT EXISTS "surgeons_i18n" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "surgeon_id"  uuid         NOT NULL REFERENCES "surgeons" ("id") ON DELETE CASCADE,
  "locale"      varchar(16)  NOT NULL,
  "name"        varchar(120) NOT NULL DEFAULT '',
  "position"    varchar(200) NOT NULL DEFAULT '',
  "institution" varchar(200) NOT NULL DEFAULT '',
  "expertise"   varchar(300) NOT NULL DEFAULT '',
  "experience"  varchar(300) NOT NULL DEFAULT '',
  "grade_title" varchar(120) NOT NULL DEFAULT '',
  "tags"        jsonb        NOT NULL DEFAULT '[]'::jsonb,
  "created_at"  timestamptz  NOT NULL DEFAULT now(),
  "updated_at"  timestamptz  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "surgeons_i18n_surgeon_locale_unique" ON "surgeons_i18n" ("surgeon_id", "locale");
CREATE INDEX IF NOT EXISTS "surgeons_i18n_surgeon_id_idx" ON "surgeons_i18n" ("surgeon_id");

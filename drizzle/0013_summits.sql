-- 0013_summits: Industry Summits tables
DO $$ BEGIN
  CREATE TYPE "summit_status" AS ENUM ('upcoming', 'registering', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "summits" (
  "id"           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug"         varchar(64) NOT NULL,
  "status"       summit_status NOT NULL DEFAULT 'upcoming',
  "start_date"   timestamptz,
  "end_date"     timestamptz,
  "cover_image"  text        NOT NULL DEFAULT '',
  "venue_image"  text        NOT NULL DEFAULT '',
  "agenda"       jsonb       NOT NULL DEFAULT '[]'::jsonb,
  "sort_order"   integer     NOT NULL DEFAULT 0,
  "created_at"   timestamptz NOT NULL DEFAULT now(),
  "updated_at"   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "summits_slug_unique"       ON "summits" ("slug");
CREATE        INDEX IF NOT EXISTS "summits_status_idx"        ON "summits" ("status");
CREATE        INDEX IF NOT EXISTS "summits_start_date_idx"    ON "summits" ("start_date");

CREATE TABLE IF NOT EXISTS "summits_i18n" (
  "id"             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "summit_id"      uuid         NOT NULL REFERENCES "summits" ("id") ON DELETE CASCADE,
  "locale"         varchar(16)  NOT NULL,
  "title"          varchar(300) NOT NULL DEFAULT '',
  "description"    text         NOT NULL DEFAULT '',
  "scale"          varchar(200) NOT NULL DEFAULT '',
  "duration"       varchar(100) NOT NULL DEFAULT '',
  "location"       varchar(300) NOT NULL DEFAULT '',
  "address"        varchar(400) NOT NULL DEFAULT '',
  "transportation" text         NOT NULL DEFAULT '',
  "speakers"       jsonb        NOT NULL DEFAULT '[]'::jsonb,
  "created_at"     timestamptz  NOT NULL DEFAULT now(),
  "updated_at"     timestamptz  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "summits_i18n_summit_locale_unique" ON "summits_i18n" ("summit_id", "locale");
CREATE        INDEX IF NOT EXISTS "summits_i18n_summit_id_idx"        ON "summits_i18n" ("summit_id");

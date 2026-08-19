-- 0012_partner_centers: Partner Centers tables
DO $$ BEGIN
  CREATE TYPE "center_region" AS ENUM (
    'asia-pacific', 'europe', 'north-america',
    'latin-america', 'middle-east-africa', 'oceania'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "partner_centers" (
  "id"           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug"         varchar(64) NOT NULL,
  "region"       center_region NOT NULL DEFAULT 'asia-pacific',
  "cover_image"  text        NOT NULL DEFAULT '',
  "logo"         text        NOT NULL DEFAULT '',
  "sort_order"   integer     NOT NULL DEFAULT 0,
  "created_at"   timestamptz NOT NULL DEFAULT now(),
  "updated_at"   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "partner_centers_slug_unique"   ON "partner_centers" ("slug");
CREATE        INDEX IF NOT EXISTS "partner_centers_region_idx"    ON "partner_centers" ("region");
CREATE        INDEX IF NOT EXISTS "partner_centers_sort_idx"      ON "partner_centers" ("sort_order");

CREATE TABLE IF NOT EXISTS "partner_centers_i18n" (
  "id"             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "center_id"      uuid         NOT NULL REFERENCES "partner_centers" ("id") ON DELETE CASCADE,
  "locale"         varchar(16)  NOT NULL,
  "name"           varchar(200) NOT NULL DEFAULT '',
  "description"    text         NOT NULL DEFAULT '',
  "location"       varchar(300) NOT NULL DEFAULT '',
  "badge_text"     varchar(120) NOT NULL DEFAULT '',
  "address"        varchar(400) NOT NULL DEFAULT '',
  "business_hours" varchar(200) NOT NULL DEFAULT '',
  "contact"        varchar(200) NOT NULL DEFAULT '',
  "website"        varchar(300) NOT NULL DEFAULT '',
  "tags"           jsonb        NOT NULL DEFAULT '[]'::jsonb,
  "created_at"     timestamptz  NOT NULL DEFAULT now(),
  "updated_at"     timestamptz  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "partner_centers_i18n_center_locale_unique" ON "partner_centers_i18n" ("center_id", "locale");
CREATE        INDEX IF NOT EXISTS "partner_centers_i18n_center_id_idx"        ON "partner_centers_i18n" ("center_id");

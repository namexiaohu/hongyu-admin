-- Market events (市场活动): mirror of summits, with data copied from industry summits.

DO $$ BEGIN
  CREATE TYPE "market_event_status" AS ENUM ('upcoming', 'registering', 'completed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "market_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(64) NOT NULL,
  "status" "market_event_status" DEFAULT 'upcoming' NOT NULL,
  "start_date" timestamp with time zone,
  "end_date" timestamp with time zone,
  "cover_image" text DEFAULT '' NOT NULL,
  "cover_mode" text DEFAULT '' NOT NULL,
  "cover_value" text DEFAULT '' NOT NULL,
  "video_url" text DEFAULT '' NOT NULL,
  "background_image" text DEFAULT '' NOT NULL,
  "background_mode" text DEFAULT '' NOT NULL,
  "background_value" text DEFAULT '' NOT NULL,
  "show_cover_on_background" boolean DEFAULT true NOT NULL,
  "cover_display" jsonb DEFAULT '{"video":true,"cover":true,"gallery":false}'::jsonb NOT NULL,
  "hero_copy_style" text,
  "venue_image" text DEFAULT '' NOT NULL,
  "agenda" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "market_events_slug_unique" ON "market_events" ("slug");
CREATE INDEX IF NOT EXISTS "market_events_status_idx" ON "market_events" ("status");
CREATE INDEX IF NOT EXISTS "market_events_start_date_idx" ON "market_events" ("start_date");

CREATE TABLE IF NOT EXISTS "market_events_i18n" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "market_event_id" uuid NOT NULL,
  "locale" varchar(16) NOT NULL,
  "title" varchar(300) DEFAULT '' NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "detail_description" text DEFAULT '' NOT NULL,
  "scale" varchar(200) DEFAULT '' NOT NULL,
  "duration" varchar(100) DEFAULT '' NOT NULL,
  "location" varchar(300) DEFAULT '' NOT NULL,
  "address" varchar(400) DEFAULT '' NOT NULL,
  "transportation" text DEFAULT '' NOT NULL,
  "stats" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "speakers" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "sponsors" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "market_events_i18n"
    ADD CONSTRAINT "market_events_i18n_market_event_id_market_events_id_fk"
    FOREIGN KEY ("market_event_id") REFERENCES "market_events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "market_events_i18n_market_event_locale_unique"
  ON "market_events_i18n" ("market_event_id", "locale");
CREATE INDEX IF NOT EXISTS "market_events_i18n_market_event_id_idx"
  ON "market_events_i18n" ("market_event_id");

-- Copy industry summit rows when market_events is still empty.
INSERT INTO "market_events" (
  "id", "slug", "status", "start_date", "end_date",
  "cover_image", "cover_mode", "cover_value", "video_url",
  "background_image", "background_mode", "background_value",
  "show_cover_on_background", "cover_display", "hero_copy_style", "venue_image",
  "agenda", "sort_order", "created_at", "updated_at"
)
SELECT
  s."id", s."slug", s."status"::text::"market_event_status", s."start_date", s."end_date",
  s."cover_image", s."cover_mode", s."cover_value", s."video_url",
  s."background_image", s."background_mode", s."background_value",
  s."show_cover_on_background", s."cover_display", s."hero_copy_style", s."venue_image",
  s."agenda", s."sort_order", s."created_at", s."updated_at"
FROM "summits" s
WHERE NOT EXISTS (SELECT 1 FROM "market_events" LIMIT 1);

INSERT INTO "market_events_i18n" (
  "id", "market_event_id", "locale",
  "title", "description", "detail_description",
  "scale", "duration", "location", "address", "transportation",
  "stats", "speakers", "sponsors",
  "created_at", "updated_at"
)
SELECT
  t."id", t."summit_id", t."locale",
  t."title", t."description", t."detail_description",
  t."scale", t."duration", t."location", t."address", t."transportation",
  t."stats", t."speakers", t."sponsors",
  t."created_at", t."updated_at"
FROM "summits_i18n" t
WHERE EXISTS (SELECT 1 FROM "market_events" me WHERE me."id" = t."summit_id")
  AND NOT EXISTS (
    SELECT 1 FROM "market_events_i18n" x
    WHERE x."market_event_id" = t."summit_id" AND x."locale" = t."locale"
  );

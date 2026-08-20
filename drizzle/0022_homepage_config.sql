CREATE TABLE IF NOT EXISTS "homepage_configs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "banner_slides" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "about_slides" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "homepage_configs_i18n" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "config_id" uuid NOT NULL REFERENCES "homepage_configs"("id") ON DELETE CASCADE,
  "locale" varchar(16) NOT NULL,
  "banner_title" text NOT NULL DEFAULT '',
  "banner_subtitle" text NOT NULL DEFAULT '',
  "banner_description" text NOT NULL DEFAULT '',
  "solutions_title" text NOT NULL DEFAULT '',
  "solutions_description" text NOT NULL DEFAULT '',
  "about_title" text NOT NULL DEFAULT '',
  "about_description" text NOT NULL DEFAULT '',
  "stats" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "global_title" text NOT NULL DEFAULT '',
  "global_description" text NOT NULL DEFAULT '',
  "education_items" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "homepage_configs_i18n_config_locale_unique"
  ON "homepage_configs_i18n" ("config_id", "locale");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "homepage_configs_i18n_config_id_idx"
  ON "homepage_configs_i18n" ("config_id");

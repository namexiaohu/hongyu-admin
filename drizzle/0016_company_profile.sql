CREATE TABLE IF NOT EXISTS "company_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "phone" varchar(120) NOT NULL DEFAULT '',
  "email" varchar(255) NOT NULL DEFAULT '',
  "website" varchar(300) NOT NULL DEFAULT '',
  "icp_number" varchar(120) NOT NULL DEFAULT '',
  "public_files" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_profiles_i18n" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "profile_id" uuid NOT NULL REFERENCES "company_profiles"("id") ON DELETE CASCADE,
  "locale" varchar(16) NOT NULL,
  "company_name" varchar(255) NOT NULL DEFAULT '',
  "slogan" varchar(255) NOT NULL DEFAULT '',
  "positioning" text NOT NULL DEFAULT '',
  "basic_info" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "executives" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "managers" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "offices" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "company_profiles_i18n_profile_locale_unique"
  ON "company_profiles_i18n" ("profile_id", "locale");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_profiles_i18n_profile_id_idx"
  ON "company_profiles_i18n" ("profile_id");

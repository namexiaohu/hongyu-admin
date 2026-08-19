CREATE TABLE IF NOT EXISTS "solutions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(64) NOT NULL,
  "category_id" uuid NOT NULL REFERENCES "categories"("id") ON DELETE RESTRICT,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "status" "cms_status" DEFAULT 'draft' NOT NULL,
  "published_at" timestamp with time zone,
  "cover_image" text DEFAULT '' NOT NULL,
  "materials" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "solutions_slug_unique" ON "solutions" ("slug");
CREATE INDEX IF NOT EXISTS "solutions_status_sort_idx" ON "solutions" ("status", "sort_order");
CREATE INDEX IF NOT EXISTS "solutions_category_id_idx" ON "solutions" ("category_id");

CREATE TABLE IF NOT EXISTS "solutions_i18n" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "solution_id" uuid NOT NULL REFERENCES "solutions"("id") ON DELETE CASCADE,
  "locale" varchar(16) NOT NULL,
  "title" varchar(255) DEFAULT '' NOT NULL,
  "large_title" varchar(255) DEFAULT '' NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "badge_text" varchar(120) DEFAULT '' NOT NULL,
  "seo_title" varchar(255) DEFAULT '' NOT NULL,
  "seo_description" varchar(500) DEFAULT '' NOT NULL,
  "stats" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "product_params" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "solutions_i18n_solution_locale_unique" ON "solutions_i18n" ("solution_id", "locale");
CREATE INDEX IF NOT EXISTS "solutions_i18n_solution_id_idx" ON "solutions_i18n" ("solution_id");

CREATE TABLE IF NOT EXISTS "solution_contents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "solution_id" uuid NOT NULL REFERENCES "solutions"("id") ON DELETE CASCADE,
  "blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "solution_contents_solution_id_unique" ON "solution_contents" ("solution_id");

CREATE TABLE IF NOT EXISTS "editorial_coverage_boards" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "board_key" varchar(100) NOT NULL,
  "content_type" "editorial_content_type" DEFAULT 'content' NOT NULL,
  "source_mode" varchar(32) DEFAULT 'admin-managed' NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "editorial_coverage_boards_board_key_unique" ON "editorial_coverage_boards" ("board_key");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "editorial_coverage_boards_i18n" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "board_id" uuid NOT NULL REFERENCES "editorial_coverage_boards"("id") ON DELETE CASCADE,
  "locale" varchar(16) NOT NULL,
  "name" varchar(150) NOT NULL,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "editorial_coverage_boards_i18n_board_locale_unique" ON "editorial_coverage_boards_i18n" ("board_id", "locale");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "editorial_coverage_boards_i18n_board_id_idx" ON "editorial_coverage_boards_i18n" ("board_id");

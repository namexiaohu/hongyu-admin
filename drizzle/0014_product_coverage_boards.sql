-- 0014_product_coverage_boards: Product coverage boards with i18n support
CREATE TABLE IF NOT EXISTS "product_coverage_boards" (
  "id"          uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "board_key"   varchar(100) NOT NULL,
  "source_mode" varchar(32)  NOT NULL DEFAULT 'admin-managed',
  "enabled"     boolean      NOT NULL DEFAULT true,
  "created_at"  timestamptz  NOT NULL DEFAULT now(),
  "updated_at"  timestamptz  NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_coverage_boards_board_key_unique"
  ON "product_coverage_boards" ("board_key");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "product_coverage_boards_i18n" (
  "id"          uuid         PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "board_id"    uuid         NOT NULL REFERENCES "product_coverage_boards"("id") ON DELETE CASCADE,
  "locale"      varchar(16)  NOT NULL,
  "name"        varchar(200) NOT NULL DEFAULT '',
  "description" text,
  "created_at"  timestamptz  NOT NULL DEFAULT now(),
  "updated_at"  timestamptz  NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_coverage_boards_i18n_board_locale_unique"
  ON "product_coverage_boards_i18n" ("board_id", "locale");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_coverage_boards_i18n_board_id_idx"
  ON "product_coverage_boards_i18n" ("board_id");
--> statement-breakpoint

-- Seed system boards (featured / newest / hot-sale)
INSERT INTO "product_coverage_boards" ("board_key", "source_mode", "enabled", "created_at", "updated_at")
VALUES
  ('featured',  'code-seeded', true, now(), now()),
  ('newest',    'code-seeded', true, now(), now()),
  ('hot-sale',  'code-seeded', true, now(), now())
ON CONFLICT ("board_key") DO NOTHING;

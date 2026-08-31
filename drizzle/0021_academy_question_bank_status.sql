ALTER TABLE "academy_question_banks"
  ADD COLUMN IF NOT EXISTS "status" "cms_status" DEFAULT 'draft' NOT NULL,
  ADD COLUMN IF NOT EXISTS "published_at" timestamptz;

UPDATE "academy_question_banks"
SET
  "status" = 'published',
  "published_at" = COALESCE("published_at", "updated_at", now())
WHERE "status" = 'draft';

CREATE INDEX IF NOT EXISTS "academy_question_banks_status_idx"
  ON "academy_question_banks" ("status");

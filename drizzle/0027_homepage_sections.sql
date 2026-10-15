ALTER TABLE "homepage_configs" ADD COLUMN IF NOT EXISTS "sections" jsonb;

UPDATE "homepage_configs"
SET "sections" = '[
  {"key":"banner","enabled":true},
  {"key":"solutions","enabled":true},
  {"key":"about","enabled":true},
  {"key":"stats","enabled":true},
  {"key":"global","enabled":true},
  {"key":"education","enabled":true}
]'::jsonb
WHERE "sections" IS NULL;

ALTER TABLE "homepage_configs"
  ALTER COLUMN "sections" SET DEFAULT '[
    {"key":"banner","enabled":true},
    {"key":"solutions","enabled":true},
    {"key":"about","enabled":true},
    {"key":"stats","enabled":true},
    {"key":"global","enabled":true},
    {"key":"education","enabled":true}
  ]'::jsonb;

ALTER TABLE "homepage_configs"
  ALTER COLUMN "sections" SET NOT NULL;

-- Sync map.tipFoot copy (list anchor, not detail page) and backfill `zh` from `zh-CN`.

UPDATE "ui_strings"
SET
  "default_text" = 'Click an entry to jump to that partner center on the list.',
  "updated_at" = now()
WHERE "site" = 'web' AND "key" = 'map.tipFoot';

INSERT INTO "ui_string_translations" ("site", "key", "locale", "value", "source", "updated_at")
VALUES
  ('web', 'map.tipFoot', 'zh-CN', '点击条目可定位到对应合作中心。', 'manual', now()),
  ('web', 'map.tipFoot', 'zh', '点击条目可定位到对应合作中心。', 'manual', now()),
  ('web', 'map.tipFoot', 'es', 'Haz clic en una entrada para ir a ese centro asociado en la lista.', 'manual', now())
ON CONFLICT ("site", "key", "locale") DO UPDATE SET
  "value" = EXCLUDED."value",
  "source" = EXCLUDED."source",
  "updated_at" = now();

-- Backfill bare `zh` for all active map.* keys from zh-CN (skip tipFoot already set above).
INSERT INTO "ui_string_translations" ("site", "key", "locale", "value", "source", "updated_at")
SELECT
  t."site",
  t."key",
  'zh' AS "locale",
  t."value",
  'manual' AS "source",
  now() AS "updated_at"
FROM "ui_string_translations" AS t
INNER JOIN "ui_strings" AS s
  ON s."site" = t."site" AND s."key" = t."key"
WHERE t."site" = 'web'
  AND t."locale" = 'zh-CN'
  AND t."key" LIKE 'map.%'
  AND t."key" <> 'map.tipFoot'
  AND s."status" = 'active'
ON CONFLICT ("site", "key", "locale") DO UPDATE SET
  "value" = EXCLUDED."value",
  "updated_at" = now();

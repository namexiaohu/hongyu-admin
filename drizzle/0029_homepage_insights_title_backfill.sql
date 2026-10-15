-- Backfill homepage insightsTitle from existing UI string home.insights.titleLine1.
UPDATE "homepage_configs_i18n" AS h
SET
  "insights_title" = src."title",
  "updated_at" = now()
FROM (
  SELECT
    h2."id" AS "id",
    COALESCE(
      NULLIF(BTRIM(t."value"), ''),
      NULLIF(BTRIM(s."default_text"), '')
    ) AS "title"
  FROM "homepage_configs_i18n" AS h2
  INNER JOIN "ui_strings" AS s
    ON s."site" = 'web'
    AND s."key" = 'home.insights.titleLine1'
  LEFT JOIN "ui_string_translations" AS t
    ON t."site" = s."site"
    AND t."key" = s."key"
    AND t."locale" = h2."locale"
  WHERE h2."insights_title" IS NULL
     OR BTRIM(h2."insights_title") = ''
) AS src
WHERE h."id" = src."id"
  AND src."title" IS NOT NULL
  AND BTRIM(src."title") <> '';

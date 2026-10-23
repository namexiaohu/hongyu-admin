-- Rename pinned → home-top (系统内置「首页置顶」); keep zh-CN only.

-- Content assignments
UPDATE "editorial_content_boards"
SET "board_key" = 'home-top'
WHERE "board_key" = 'pinned';

UPDATE "editorial_contents"
SET "board_key" = 'home-top',
    "updated_at" = now()
WHERE "board_key" = 'pinned';

-- Coverage board row
UPDATE "editorial_coverage_boards"
SET "board_key" = 'home-top',
    "source_mode" = 'admin-managed',
    "updated_at" = now()
WHERE "board_key" = 'pinned';

-- Drop non-Chinese translations for this board
DELETE FROM "editorial_coverage_boards_i18n" t
USING "editorial_coverage_boards" b
WHERE t."board_id" = b."id"
  AND b."board_key" = 'home-top'
  AND t."locale" <> 'zh-CN';

-- Upsert Chinese name
INSERT INTO "editorial_coverage_boards_i18n" ("board_id", "locale", "name", "description")
SELECT b.id, 'zh-CN', '首页置顶', '首页资讯列表置顶展示；不在 /insights 分类列表中单独出现。'
FROM "editorial_coverage_boards" b
WHERE b."board_key" = 'home-top'
ON CONFLICT ("board_id", "locale") DO UPDATE
SET "name" = EXCLUDED."name",
    "description" = EXCLUDED."description",
    "updated_at" = now();

-- Insert board if missing (fresh envs that never got 0033 pinned)
INSERT INTO "editorial_coverage_boards" ("board_key", "content_type", "source_mode", "enabled")
VALUES ('home-top', 'content', 'admin-managed', true)
ON CONFLICT ("board_key") DO NOTHING;

INSERT INTO "editorial_coverage_boards_i18n" ("board_id", "locale", "name", "description")
SELECT b.id, 'zh-CN', '首页置顶', '首页资讯列表置顶展示；不在 /insights 分类列表中单独出现。'
FROM "editorial_coverage_boards" b
WHERE b."board_key" = 'home-top'
ON CONFLICT ("board_id", "locale") DO NOTHING;

-- editorial_settings JSON: replace pinned entry or append home-top
UPDATE "editorial_settings"
SET "coverage_boards" = (
      SELECT COALESCE(jsonb_agg(
        CASE
          WHEN elem->>'key' = 'pinned' THEN jsonb_build_object(
            'key', 'home-top',
            'title', '首页置顶',
            'contentType', 'content',
            'note', '首页资讯列表置顶展示；不在 /insights 分类列表中单独出现。',
            'sourceMode', 'admin-managed',
            'enabled', COALESCE((elem->>'enabled')::boolean, true)
          )
          ELSE elem
        END
        ORDER BY ordinality
      ), '[]'::jsonb)
      FROM jsonb_array_elements("coverage_boards") WITH ORDINALITY AS t(elem, ordinality)
    ),
    "updated_at" = now()
WHERE "id" = 'default'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements("coverage_boards") AS elem
    WHERE elem->>'key' = 'pinned'
  );

UPDATE "editorial_settings"
SET "coverage_boards" = "coverage_boards" || jsonb_build_array(
      jsonb_build_object(
        'key', 'home-top',
        'title', '首页置顶',
        'contentType', 'content',
        'note', '首页资讯列表置顶展示；不在 /insights 分类列表中单独出现。',
        'sourceMode', 'admin-managed',
        'enabled', true
      )
    ),
    "updated_at" = now()
WHERE "id" = 'default'
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements("coverage_boards") AS elem
    WHERE elem->>'key' IN ('home-top', 'pinned')
  );

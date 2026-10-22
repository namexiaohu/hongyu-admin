INSERT INTO "editorial_coverage_boards" ("board_key", "content_type", "source_mode", "enabled")
VALUES
  ('market', 'content', 'admin-managed', true),
  ('pinned', 'content', 'admin-managed', true)
ON CONFLICT ("board_key") DO NOTHING;

INSERT INTO "editorial_coverage_boards_i18n" ("board_id", "locale", "name", "description")
SELECT b.id, v.locale, v.name, v.description
FROM "editorial_coverage_boards" b
JOIN (
  VALUES
    ('market', 'en', 'Market Events', 'Market activities, exhibitions, and field programs.'),
    ('market', 'zh-CN', '市场活动', NULL),
    ('pinned', 'en', 'Pinned', 'Pinned to the top of the homepage news list. Hidden from the insights index.'),
    ('pinned', 'zh-CN', '置顶', NULL)
) AS v(board_key, locale, name, description)
  ON v.board_key = b.board_key
ON CONFLICT ("board_id", "locale") DO NOTHING;

UPDATE "editorial_settings"
SET "coverage_boards" = "coverage_boards" || jsonb_build_array(
      jsonb_build_object(
        'key', 'market',
        'title', 'Market Events',
        'contentType', 'content',
        'note', 'Market activities, exhibitions, and field programs.',
        'sourceMode', 'admin-managed',
        'enabled', true
      )
    ),
    "updated_at" = now()
WHERE "id" = 'default'
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements("coverage_boards") AS elem
    WHERE elem->>'key' = 'market'
  );

UPDATE "editorial_settings"
SET "coverage_boards" = "coverage_boards" || jsonb_build_array(
      jsonb_build_object(
        'key', 'pinned',
        'title', 'Pinned',
        'contentType', 'content',
        'note', 'Pinned to the top of the homepage news list. Hidden from the insights index.',
        'sourceMode', 'admin-managed',
        'enabled', true
      )
    ),
    "updated_at" = now()
WHERE "id" = 'default'
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements("coverage_boards") AS elem
    WHERE elem->>'key' = 'pinned'
  );

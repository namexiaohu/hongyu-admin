-- List hero boards with empty backgroundMode but a leftover backgroundImage were
-- rendered as uploads on storefront, while admin looked like an empty/solid config.
-- Clear orphan images so empty boards fall back to the default solid gradient.
UPDATE "website_configs"
SET
  "list_hero_boards" = jsonb_set(
    "list_hero_boards",
    '{insights,backgroundImage}',
    '""'::jsonb,
    true
  ),
  "updated_at" = now()
WHERE COALESCE("list_hero_boards"#>>'{insights,backgroundMode}', '') = ''
  AND COALESCE("list_hero_boards"#>>'{insights,backgroundImage}', '') <> '';

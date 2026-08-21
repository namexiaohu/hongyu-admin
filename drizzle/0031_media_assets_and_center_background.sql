-- 0031_media_assets_and_center_background
CREATE TABLE IF NOT EXISTS "media_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type" text NOT NULL,
  "storage_key" text NOT NULL,
  "filename" text NOT NULL DEFAULT '',
  "content_type" text NOT NULL DEFAULT '',
  "byte_size" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_assets_type_created_at_idx" ON "media_assets" ("type", "created_at" DESC);
--> statement-breakpoint
ALTER TABLE "partner_centers"
  ADD COLUMN IF NOT EXISTS "background_mode" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "background_value" text NOT NULL DEFAULT '';
--> statement-breakpoint
-- Migrate legacy background_image keys into media_assets + upload mode
DO $$
DECLARE
  r RECORD;
  new_id uuid;
BEGIN
  FOR r IN
    SELECT id, background_image
    FROM partner_centers
    WHERE COALESCE(background_image, '') <> ''
      AND COALESCE(background_mode, '') = ''
  LOOP
    new_id := gen_random_uuid();
    INSERT INTO media_assets (id, type, storage_key, filename, content_type, byte_size)
    VALUES (
      new_id,
      'partner_center_background',
      r.background_image,
      split_part(r.background_image, '/', -1),
      'image/jpeg',
      0
    );
    UPDATE partner_centers
    SET background_mode = 'upload',
        background_value = new_id::text
    WHERE id = r.id;
  END LOOP;
END $$;

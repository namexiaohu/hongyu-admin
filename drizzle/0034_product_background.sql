-- 0034_product_background
-- Products: big background + show cover (default on; leave background empty)
ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "background_image" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "background_mode" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "background_value" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "show_cover_on_background" boolean NOT NULL DEFAULT true;

UPDATE "products" SET "show_cover_on_background" = true;

-- 0032_partner_center_show_cover_on_background
ALTER TABLE "partner_centers"
  ADD COLUMN IF NOT EXISTS "show_cover_on_background" boolean NOT NULL DEFAULT false;

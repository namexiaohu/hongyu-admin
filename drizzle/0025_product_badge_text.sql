ALTER TABLE product_translations
  ADD COLUMN IF NOT EXISTS badge_text varchar(120) NOT NULL DEFAULT '';

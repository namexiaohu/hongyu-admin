ALTER TABLE product_translations
  ADD COLUMN IF NOT EXISTS extra_text varchar(255) NOT NULL DEFAULT '';

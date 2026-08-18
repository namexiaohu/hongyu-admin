-- brand_narratives_i18n: payload 已完全拆分为独立字段，删除冗余列
ALTER TABLE brand_narratives_i18n DROP COLUMN IF EXISTS payload;

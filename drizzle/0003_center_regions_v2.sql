-- center_region v2: north-america / south-america / europe / china / asia-pacific / africa
-- Convert column to text first so heuristic UPDATEs work in one transaction.

ALTER TABLE "partner_centers" ALTER COLUMN "region" DROP DEFAULT;

ALTER TABLE "partner_centers"
  ALTER COLUMN "region" TYPE text
  USING ("region"::text);

-- oceania → asia-pacific
UPDATE "partner_centers"
SET "region" = 'asia-pacific'
WHERE "region" = 'oceania';

-- latin-america → north-america when Mexico / Central America / Caribbean hints
UPDATE "partner_centers" AS pc
SET "region" = 'north-america'
WHERE pc."region" = 'latin-america'
  AND EXISTS (
    SELECT 1 FROM "partner_centers_i18n" t
    WHERE t."center_id" = pc."id"
      AND (
        t."location" ~* '(mexico|墨西哥|central america|caribbean|加勒比|中美洲|guatemala|honduras|costa rica|panama|cuba|jamaica|dominican)'
        OR t."name" ~* '(mexico|墨西哥|caribbean|加勒比)'
        OR t."address" ~* '(mexico|墨西哥)'
        OR pc."slug" ~* '(mexico|caribbean|guatemala|panama|cuba)'
      )
  );

UPDATE "partner_centers"
SET "region" = 'south-america'
WHERE "region" = 'latin-america';

-- middle-east-africa → africa if African hints, else asia-pacific
UPDATE "partner_centers" AS pc
SET "region" = 'africa'
WHERE pc."region" = 'middle-east-africa'
  AND EXISTS (
    SELECT 1 FROM "partner_centers_i18n" t
    WHERE t."center_id" = pc."id"
      AND (
        t."location" ~* '(africa|非洲|nigeria|kenya|egypt|南非|south africa|ghana|ethiopia|morocco|tunisia|algeria|tanzania|uganda)'
        OR t."name" ~* '(africa|非洲|nigeria|kenya|南非)'
        OR t."address" ~* '(africa|非洲|nigeria|kenya|南非)'
        OR pc."slug" ~* '(africa|nigeria|kenya|egypt|south-africa|ghana)'
      )
  );

UPDATE "partner_centers"
SET "region" = 'asia-pacific'
WHERE "region" = 'middle-east-africa';

-- asia-pacific → china when CN/HK/MO/TW hints
UPDATE "partner_centers" AS pc
SET "region" = 'china'
WHERE pc."region" = 'asia-pacific'
  AND EXISTS (
    SELECT 1 FROM "partner_centers_i18n" t
    WHERE t."center_id" = pc."id"
      AND (
        t."location" ~* '(中国|china|北京|上海|广州|深圳|香港|hong\s*kong|澳门|macau|macao|台湾|taiwan|台北)'
        OR t."name" ~* '(中国|china|北京|上海|香港|hong\s*kong|澳门|台湾|taiwan)'
        OR t."address" ~* '(中国|china|北京|上海|香港|澳门|台湾)'
        OR pc."slug" ~* '(beijing|shanghai|guangzhou|shenzhen|hong-kong|hongkong|macau|taiwan|taipei|china-|cn-)'
      )
  );

-- europe → asia-pacific for Russia / former-Soviet related
UPDATE "partner_centers" AS pc
SET "region" = 'asia-pacific'
WHERE pc."region" = 'europe'
  AND EXISTS (
    SELECT 1 FROM "partner_centers_i18n" t
    WHERE t."center_id" = pc."id"
      AND (
        t."location" ~* '(russia|俄罗斯|ukraine|乌克兰|belarus|白俄|moldova|摩尔多瓦|georgia|格鲁吉亚|armenia|azerbaijan|kazakhstan|uzbekistan|kyrgyz|tajik|turkmen)'
        OR t."name" ~* '(russia|俄罗斯|ukraine|乌克兰|moscow|莫斯科|kyiv|kiev)'
        OR t."address" ~* '(russia|俄罗斯|ukraine|乌克兰)'
        OR pc."slug" ~* '(russia|moscow|ukraine|kyiv|belarus|kazakhstan)'
      )
  );

-- Guard: any leftover unknown region strings → asia-pacific
UPDATE "partner_centers"
SET "region" = 'asia-pacific'
WHERE "region" NOT IN (
  'north-america',
  'south-america',
  'europe',
  'china',
  'asia-pacific',
  'africa'
);

-- Rewrite overseas_contacts JSON region strings
UPDATE "social_media_profiles"
SET "overseas_contacts" = COALESCE((
  SELECT jsonb_agg(
    CASE
      WHEN (elem->>'region') = 'oceania' THEN jsonb_set(elem, '{region}', '"asia-pacific"')
      WHEN (elem->>'region') = 'latin-america' THEN jsonb_set(elem, '{region}', '"south-america"')
      WHEN (elem->>'region') = 'middle-east-africa' THEN jsonb_set(elem, '{region}', '"asia-pacific"')
      ELSE elem
    END
  )
  FROM jsonb_array_elements(COALESCE("overseas_contacts", '[]'::jsonb)) AS elem
), '[]'::jsonb);

-- Replace enum type
DROP TYPE IF EXISTS "public"."center_region_new";
CREATE TYPE "public"."center_region_new" AS ENUM (
  'north-america',
  'south-america',
  'europe',
  'china',
  'asia-pacific',
  'africa'
);

ALTER TABLE "partner_centers"
  ALTER COLUMN "region" TYPE "public"."center_region_new"
  USING ("region"::"public"."center_region_new");

DROP TYPE "public"."center_region";
ALTER TYPE "public"."center_region_new" RENAME TO "center_region";

ALTER TABLE "partner_centers"
  ALTER COLUMN "region" SET DEFAULT 'asia-pacific'::"public"."center_region";

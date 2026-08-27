ALTER TABLE "company_profiles_i18n"
  ADD COLUMN IF NOT EXISTS "management_team" jsonb DEFAULT '[]'::jsonb NOT NULL;

-- Convert legacy executives / managers into management_team when empty.
DO $$
DECLARE
  r RECORD;
  team jsonb;
  exec_item jsonb;
  mgr_item jsonb;
  idx int;
  exec_id text;
  mgr_id text;
  first_exec_id text;
BEGIN
  FOR r IN
    SELECT id, executives, managers, management_team
    FROM company_profiles_i18n
  LOOP
    IF r.management_team IS NOT NULL AND jsonb_typeof(r.management_team) = 'array' AND jsonb_array_length(r.management_team) > 0 THEN
      CONTINUE;
    END IF;

    team := '[]'::jsonb;
    idx := 0;
    first_exec_id := NULL;

    IF r.executives IS NOT NULL AND jsonb_typeof(r.executives) = 'array' THEN
      FOR exec_item IN SELECT * FROM jsonb_array_elements(r.executives)
      LOOP
        IF COALESCE(exec_item->>'name', '') = '' AND COALESCE(exec_item->>'title', '') = '' THEN
          CONTINUE;
        END IF;
        exec_id := gen_random_uuid()::text;
        IF first_exec_id IS NULL THEN
          first_exec_id := exec_id;
        END IF;
        team := team || jsonb_build_array(jsonb_build_object(
          'id', exec_id,
          'level', 'executive',
          'sortOrder', idx,
          'name', COALESCE(exec_item->>'name', ''),
          'title', COALESCE(exec_item->>'title', ''),
          'email', '',
          'contact', '',
          'region', '',
          'avatarUrl', '',
          'supervisorId', ''
        ));
        idx := idx + 1;
      END LOOP;
    END IF;

    IF r.managers IS NOT NULL AND jsonb_typeof(r.managers) = 'array' THEN
      FOR mgr_item IN SELECT * FROM jsonb_array_elements(r.managers)
      LOOP
        IF COALESCE(mgr_item->>'name', '') = '' AND COALESCE(mgr_item->>'title', '') = '' THEN
          CONTINUE;
        END IF;
        mgr_id := gen_random_uuid()::text;
        team := team || jsonb_build_array(jsonb_build_object(
          'id', mgr_id,
          'level', 'manager',
          'sortOrder', idx,
          'name', COALESCE(mgr_item->>'name', ''),
          'title', COALESCE(mgr_item->>'title', ''),
          'email', '',
          'contact', '',
          'region', '',
          'avatarUrl', '',
          'supervisorId', COALESCE(first_exec_id, '')
        ));
        idx := idx + 1;
      END LOOP;
    END IF;

    UPDATE company_profiles_i18n SET management_team = team WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE "company_profiles_i18n" DROP COLUMN IF EXISTS "executives";
ALTER TABLE "company_profiles_i18n" DROP COLUMN IF EXISTS "managers";

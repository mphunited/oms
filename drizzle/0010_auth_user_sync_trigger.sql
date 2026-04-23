-- Trigger: sync auth.users → public.users on first SSO sign-in
-- Fires AFTER INSERT on auth.users so the public.users row is created
-- automatically with the correct UUID, avoiding the FK mismatch bug.
--
-- Name extraction priority:
--   1. raw_user_meta_data->>'full_name'
--   2. custom_claims given_name + family_name concatenated
--   3. email as last resort

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, is_active, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(CONCAT(
        NEW.raw_user_meta_data->'custom_claims'->>'given_name',
        ' ',
        NEW.raw_user_meta_data->'custom_claims'->>'family_name'
      )), ''),
      NEW.email
    ),
    'CSR',
    true,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

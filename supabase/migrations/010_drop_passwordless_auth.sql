-- Revert passwordless login_codes; passwords are required again.
DROP TABLE IF EXISTS connectpro_auth.login_codes;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'connectpro_auth' AND table_name = 'users' AND column_name = 'password_hash'
  ) AND NOT EXISTS (
    SELECT 1 FROM connectpro_auth.users WHERE password_hash IS NULL
  ) THEN
    ALTER TABLE connectpro_auth.users ALTER COLUMN password_hash SET NOT NULL;
  END IF;
END $$;

-- Revert passwordless login_codes; passwords are required again.
-- Safe if passwordless was never applied.

DROP TABLE IF EXISTS auth.login_codes;
DROP TABLE IF EXISTS connectpro_auth.login_codes;

-- Restore NOT NULL only where every row already has a hash
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'password_hash'
  ) AND NOT EXISTS (
    SELECT 1 FROM auth.users WHERE password_hash IS NULL
  ) THEN
    ALTER TABLE auth.users ALTER COLUMN password_hash SET NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'connectpro_auth' AND table_name = 'users' AND column_name = 'password_hash'
  ) AND NOT EXISTS (
    SELECT 1 FROM connectpro_auth.users WHERE password_hash IS NULL
  ) THEN
    ALTER TABLE connectpro_auth.users ALTER COLUMN password_hash SET NOT NULL;
  END IF;
END $$;

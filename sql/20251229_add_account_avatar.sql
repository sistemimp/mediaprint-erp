ALTER TABLE auth_accounts
  ADD COLUMN avatar_path varchar(255) DEFAULT NULL AFTER mfa_secret;

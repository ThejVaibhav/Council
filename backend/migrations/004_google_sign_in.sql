-- Google sign-in: accounts may have no password, and are matched by Google's stable user id.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub text UNIQUE;

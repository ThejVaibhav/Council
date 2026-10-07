-- A separate, read-only code for sharing a plan's recap publicly. The invite code stays private to the group.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS share_code text UNIQUE;

ALTER TABLE events ADD COLUMN settings_revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE teams ADD COLUMN completed_challenges TEXT;
ALTER TABLE teams ADD COLUMN progress_updated_at INTEGER;
ALTER TABLE teams ADD COLUMN progress_client_at INTEGER;

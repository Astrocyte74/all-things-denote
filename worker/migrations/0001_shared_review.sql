PRAGMA foreign_keys = ON;
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  leader_hash TEXT NOT NULL,
  join_token TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  closed INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0,
  last_purged_at INTEGER NOT NULL DEFAULT 0,
  photo_count INTEGER NOT NULL DEFAULT 0,
  photo_bytes INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX events_expiry ON events(expires_at);
CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  path_id TEXT,
  joined_at INTEGER NOT NULL,
  UNIQUE(event_id, token_hash)
);
CREATE INDEX teams_event ON teams(event_id);
CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  local_photo_id TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  challenge_number INTEGER NOT NULL,
  challenge_title TEXT NOT NULL,
  team_name TEXT,
  path_id TEXT,
  captured_at INTEGER NOT NULL,
  uploaded_at INTEGER NOT NULL,
  bytes INTEGER NOT NULL,
  digest TEXT NOT NULL,
  ready INTEGER NOT NULL DEFAULT 0,
  UNIQUE(event_id, team_id, local_photo_id)
);
CREATE INDEX photos_event ON photos(event_id, ready, challenge_number);
CREATE INDEX photos_team ON photos(team_id);
CREATE TRIGGER photo_reserved AFTER INSERT ON photos BEGIN
  UPDATE events SET photo_count = photo_count + 1, photo_bytes = photo_bytes + NEW.bytes WHERE id = NEW.event_id;
END;
CREATE TRIGGER photo_removed AFTER DELETE ON photos BEGIN
  UPDATE events SET photo_count = photo_count - 1, photo_bytes = photo_bytes - OLD.bytes WHERE id = OLD.event_id;
END;
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);

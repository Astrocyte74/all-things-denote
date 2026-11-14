ALTER TABLE events ADD COLUMN auto_upload_default INTEGER NOT NULL DEFAULT 0;
CREATE TABLE photo_removals (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  local_photo_id TEXT NOT NULL,
  PRIMARY KEY(event_id, team_id, local_photo_id)
);

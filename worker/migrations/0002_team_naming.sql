ALTER TABLE events ADD COLUMN team_naming TEXT;
ALTER TABLE teams ADD COLUMN name_key TEXT;
CREATE UNIQUE INDEX teams_unique_name ON teams(event_id, name_key) WHERE name_key IS NOT NULL;

ALTER TABLE events ADD COLUMN creator_network TEXT;
CREATE INDEX events_creator_active ON events(creator_network, expires_at) WHERE deleted = 0;
CREATE TABLE event_network_salt AS SELECT lower(hex(randomblob(32))) AS value;
ALTER TABLE photos ADD COLUMN preview_bytes INTEGER NOT NULL DEFAULT 0;
CREATE TRIGGER photo_preview_reserved AFTER INSERT ON photos WHEN NEW.preview_bytes > 0 BEGIN
  UPDATE events SET photo_bytes = photo_bytes + NEW.preview_bytes WHERE id = NEW.event_id;
END;
CREATE TRIGGER photo_preview_removed AFTER DELETE ON photos WHEN OLD.preview_bytes > 0 BEGIN
  UPDATE events SET photo_bytes = photo_bytes - OLD.preview_bytes WHERE id = OLD.event_id;
END;

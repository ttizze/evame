CREATE TRIGGER reader_lists_like_pages_insert AFTER INSERT ON like_pages
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*';
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (
    SELECT 'list:home' AS key FROM pages WHERE id = NEW.page_id AND parent_id IS NULL AND status = 'PUBLIC'
    UNION SELECT 'profile:' || user_id FROM pages WHERE id = NEW.page_id AND parent_id IS NULL AND status = 'PUBLIC'
    ) AS changed CROSS JOIN reader_revisions AS counter
    WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_lists_like_pages_delete BEFORE DELETE ON like_pages
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*';
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (
    SELECT 'list:home' AS key FROM pages WHERE id = OLD.page_id AND parent_id IS NULL AND status = 'PUBLIC'
    UNION SELECT 'profile:' || user_id FROM pages WHERE id = OLD.page_id AND parent_id IS NULL AND status = 'PUBLIC'
    ) AS changed CROSS JOIN reader_revisions AS counter
    WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_lists_like_pages_update AFTER UPDATE ON like_pages
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*';
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (
    SELECT 'list:home' AS key FROM pages WHERE id = OLD.page_id AND parent_id IS NULL AND status = 'PUBLIC'
    UNION SELECT 'profile:' || user_id FROM pages WHERE id = OLD.page_id AND parent_id IS NULL AND status = 'PUBLIC'
    UNION SELECT 'list:home' AS key FROM pages WHERE id = NEW.page_id AND parent_id IS NULL AND status = 'PUBLIC'
    UNION SELECT 'profile:' || user_id FROM pages WHERE id = NEW.page_id AND parent_id IS NULL AND status = 'PUBLIC'
    ) AS changed CROSS JOIN reader_revisions AS counter
    WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;

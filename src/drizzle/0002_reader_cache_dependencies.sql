CREATE TABLE reader_cache_invalidations (
  tag text PRIMARY KEY NOT NULL,
  version text NOT NULL
);
--> statement-breakpoint
CREATE INDEX reader_revisions_revision_idx ON reader_revisions (revision);
--> statement-breakpoint
CREATE TRIGGER reader_lists_pages_insert AFTER INSERT ON pages
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*';
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT 'list:new' AS key WHERE NEW.parent_id IS NULL AND NEW.status = 'PUBLIC' UNION SELECT 'list:home' WHERE NEW.parent_id IS NULL AND NEW.status = 'PUBLIC' UNION SELECT 'profile:' || NEW.user_id WHERE NEW.parent_id IS NULL AND NEW.status = 'PUBLIC' UNION SELECT 'tag:' || tags.name FROM tag_pages JOIN tags ON tags.id = tag_pages.tag_id WHERE tag_pages.page_id = NEW.id AND NEW.status = 'PUBLIC') AS changed CROSS JOIN reader_revisions AS counter
    WHERE counter.key = '*' AND changed.key IS NOT NULL
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_lists_pages_update AFTER UPDATE ON pages WHEN OLD.parent_id IS NOT NEW.parent_id OR OLD.status IS NOT NEW.status OR OLD.user_id IS NOT NEW.user_id OR OLD.published_at IS NOT NEW.published_at OR OLD.created_at IS NOT NEW.created_at
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*';
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT 'list:new' AS key WHERE OLD.parent_id IS NULL AND OLD.status = 'PUBLIC' UNION SELECT 'list:home' WHERE OLD.parent_id IS NULL AND OLD.status = 'PUBLIC' UNION SELECT 'profile:' || OLD.user_id WHERE OLD.parent_id IS NULL AND OLD.status = 'PUBLIC' UNION SELECT 'tag:' || tags.name FROM tag_pages JOIN tags ON tags.id = tag_pages.tag_id WHERE tag_pages.page_id = OLD.id AND OLD.status = 'PUBLIC' UNION SELECT 'list:new' AS key WHERE NEW.parent_id IS NULL AND NEW.status = 'PUBLIC' UNION SELECT 'list:home' WHERE NEW.parent_id IS NULL AND NEW.status = 'PUBLIC' UNION SELECT 'profile:' || NEW.user_id WHERE NEW.parent_id IS NULL AND NEW.status = 'PUBLIC' UNION SELECT 'tag:' || tags.name FROM tag_pages JOIN tags ON tags.id = tag_pages.tag_id WHERE tag_pages.page_id = NEW.id AND NEW.status = 'PUBLIC' UNION SELECT 'nav:' || OLD.parent_id UNION SELECT 'nav:' || NEW.parent_id) AS changed CROSS JOIN reader_revisions AS counter
    WHERE counter.key = '*' AND changed.key IS NOT NULL
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_lists_pages_delete BEFORE DELETE ON pages
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*';
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT 'list:new' AS key WHERE OLD.parent_id IS NULL AND OLD.status = 'PUBLIC' UNION SELECT 'list:home' WHERE OLD.parent_id IS NULL AND OLD.status = 'PUBLIC' UNION SELECT 'profile:' || OLD.user_id WHERE OLD.parent_id IS NULL AND OLD.status = 'PUBLIC' UNION SELECT 'tag:' || tags.name FROM tag_pages JOIN tags ON tags.id = tag_pages.tag_id WHERE tag_pages.page_id = OLD.id AND OLD.status = 'PUBLIC' UNION SELECT 'nav:' || OLD.parent_id) AS changed CROSS JOIN reader_revisions AS counter
    WHERE counter.key = '*' AND changed.key IS NOT NULL
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_lists_tag_pages_insert AFTER INSERT ON tag_pages
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*';
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT 'tag:' || name AS key FROM tags WHERE id = NEW.tag_id) AS changed CROSS JOIN reader_revisions AS counter
    WHERE counter.key = '*' AND changed.key IS NOT NULL
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_lists_tag_pages_update AFTER UPDATE ON tag_pages
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*';
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT 'tag:' || name AS key FROM tags WHERE id = OLD.tag_id UNION SELECT 'tag:' || name AS key FROM tags WHERE id = NEW.tag_id) AS changed CROSS JOIN reader_revisions AS counter
    WHERE counter.key = '*' AND changed.key IS NOT NULL
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_lists_tag_pages_delete BEFORE DELETE ON tag_pages
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*';
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT 'tag:' || name AS key FROM tags WHERE id = OLD.tag_id) AS changed CROSS JOIN reader_revisions AS counter
    WHERE counter.key = '*' AND changed.key IS NOT NULL
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_lists_tags_update AFTER UPDATE ON tags
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*';
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT 'tag:' || OLD.name AS key UNION SELECT 'tag:' || NEW.name AS key) AS changed CROSS JOIN reader_revisions AS counter
    WHERE counter.key = '*' AND changed.key IS NOT NULL
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_lists_tags_delete BEFORE DELETE ON tags
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*';
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT 'tag:' || OLD.name AS key) AS changed CROSS JOIN reader_revisions AS counter
    WHERE counter.key = '*' AND changed.key IS NOT NULL
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_profiles_follows_insert AFTER INSERT ON follows
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*';
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT 'profile:' || NEW.follower_id AS key UNION SELECT 'profile:' || NEW.following_id AS key) AS changed CROSS JOIN reader_revisions AS counter
    WHERE counter.key = '*' AND changed.key IS NOT NULL
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_profiles_follows_update AFTER UPDATE ON follows
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*';
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT 'profile:' || OLD.follower_id AS key UNION SELECT 'profile:' || OLD.following_id AS key UNION SELECT 'profile:' || NEW.follower_id AS key UNION SELECT 'profile:' || NEW.following_id AS key) AS changed CROSS JOIN reader_revisions AS counter
    WHERE counter.key = '*' AND changed.key IS NOT NULL
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_profiles_follows_delete BEFORE DELETE ON follows
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*';
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT 'profile:' || OLD.follower_id AS key UNION SELECT 'profile:' || OLD.following_id AS key) AS changed CROSS JOIN reader_revisions AS counter
    WHERE counter.key = '*' AND changed.key IS NOT NULL
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_authors_users_insert AFTER INSERT ON users
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*';
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT 'author:' || NEW.handle AS key) AS changed CROSS JOIN reader_revisions AS counter
    WHERE counter.key = '*' AND changed.key IS NOT NULL
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_authors_users_update AFTER UPDATE ON users WHEN OLD.name IS NOT NEW.name OR OLD.handle IS NOT NEW.handle OR OLD.image IS NOT NEW.image OR OLD.profile IS NOT NEW.profile OR OLD.twitter_handle IS NOT NEW.twitter_handle
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*';
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT 'author:' || OLD.handle AS key UNION SELECT 'author:' || NEW.handle AS key) AS changed CROSS JOIN reader_revisions AS counter
    WHERE counter.key = '*' AND changed.key IS NOT NULL
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_authors_users_delete BEFORE DELETE ON users
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*';
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT 'author:' || OLD.handle AS key) AS changed CROSS JOIN reader_revisions AS counter
    WHERE counter.key = '*' AND changed.key IS NOT NULL
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_lists_title_insert AFTER INSERT ON segments WHEN NEW.number = 0
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*';
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT 'list:new' AS key FROM pages WHERE id = NEW.content_id AND status = 'PUBLIC' AND parent_id IS NULL UNION SELECT 'list:home' FROM pages WHERE id = NEW.content_id AND status = 'PUBLIC' AND parent_id IS NULL UNION SELECT 'profile:' || user_id FROM pages WHERE id = NEW.content_id AND status = 'PUBLIC' AND parent_id IS NULL UNION SELECT 'tag:' || name FROM tags JOIN tag_pages ON tag_pages.tag_id = tags.id JOIN pages ON pages.id = tag_pages.page_id WHERE pages.id = NEW.content_id AND pages.status = 'PUBLIC') AS changed CROSS JOIN reader_revisions AS counter
    WHERE counter.key = '*' AND changed.key IS NOT NULL
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_lists_title_delete BEFORE DELETE ON segments WHEN OLD.number = 0
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*';
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT 'list:new' AS key FROM pages WHERE id = OLD.content_id AND status = 'PUBLIC' AND parent_id IS NULL UNION SELECT 'list:home' FROM pages WHERE id = OLD.content_id AND status = 'PUBLIC' AND parent_id IS NULL UNION SELECT 'profile:' || user_id FROM pages WHERE id = OLD.content_id AND status = 'PUBLIC' AND parent_id IS NULL UNION SELECT 'tag:' || name FROM tags JOIN tag_pages ON tag_pages.tag_id = tags.id JOIN pages ON pages.id = tag_pages.page_id WHERE pages.id = OLD.content_id AND pages.status = 'PUBLIC') AS changed CROSS JOIN reader_revisions AS counter
    WHERE counter.key = '*' AND changed.key IS NOT NULL
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;

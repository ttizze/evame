CREATE TABLE `reader_revisions` (
	`key` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL
);

--> statement-breakpoint
INSERT INTO reader_revisions (key, revision) VALUES ('*', 0);
--> statement-breakpoint
CREATE TRIGGER reader_pages_insert AFTER INSERT ON pages
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT key FROM (SELECT 'page:' || NEW.id AS key) WHERE key IS NOT NULL AND (NEW.status = 'PUBLIC' OR NEW.slug IN ('evame', 'evame-ja')));
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT key FROM (SELECT 'page:' || NEW.id AS key) WHERE key IS NOT NULL AND (NEW.status = 'PUBLIC' OR NEW.slug IN ('evame', 'evame-ja'))) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_pages_update AFTER UPDATE ON pages
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT key FROM (SELECT 'page:' || OLD.id AS key) WHERE key IS NOT NULL AND (OLD.status = 'PUBLIC' OR OLD.slug IN ('evame', 'evame-ja')) UNION SELECT key FROM (SELECT 'page:' || NEW.id AS key) WHERE key IS NOT NULL AND (NEW.status = 'PUBLIC' OR NEW.slug IN ('evame', 'evame-ja')));
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT key FROM (SELECT 'page:' || OLD.id AS key) WHERE key IS NOT NULL AND (OLD.status = 'PUBLIC' OR OLD.slug IN ('evame', 'evame-ja')) UNION SELECT key FROM (SELECT 'page:' || NEW.id AS key) WHERE key IS NOT NULL AND (NEW.status = 'PUBLIC' OR NEW.slug IN ('evame', 'evame-ja'))) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_pages_delete BEFORE DELETE ON pages
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT key FROM (SELECT 'page:' || OLD.id AS key) WHERE key IS NOT NULL AND (OLD.status = 'PUBLIC' OR OLD.slug IN ('evame', 'evame-ja')));
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT key FROM (SELECT 'page:' || OLD.id AS key) WHERE key IS NOT NULL AND (OLD.status = 'PUBLIC' OR OLD.slug IN ('evame', 'evame-ja'))) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_segments_insert AFTER INSERT ON segments
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT key FROM (SELECT 'page:' || COALESCE((SELECT id FROM pages WHERE id = NEW.content_id), (SELECT page_id FROM page_comments WHERE id = NEW.content_id)) AS key) WHERE key IS NOT NULL);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT key FROM (SELECT 'page:' || COALESCE((SELECT id FROM pages WHERE id = NEW.content_id), (SELECT page_id FROM page_comments WHERE id = NEW.content_id)) AS key) WHERE key IS NOT NULL) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_segments_update AFTER UPDATE ON segments
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT key FROM (SELECT 'page:' || COALESCE((SELECT id FROM pages WHERE id = OLD.content_id), (SELECT page_id FROM page_comments WHERE id = OLD.content_id)) AS key) WHERE key IS NOT NULL UNION SELECT key FROM (SELECT 'page:' || COALESCE((SELECT id FROM pages WHERE id = NEW.content_id), (SELECT page_id FROM page_comments WHERE id = NEW.content_id)) AS key) WHERE key IS NOT NULL);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT key FROM (SELECT 'page:' || COALESCE((SELECT id FROM pages WHERE id = OLD.content_id), (SELECT page_id FROM page_comments WHERE id = OLD.content_id)) AS key) WHERE key IS NOT NULL UNION SELECT key FROM (SELECT 'page:' || COALESCE((SELECT id FROM pages WHERE id = NEW.content_id), (SELECT page_id FROM page_comments WHERE id = NEW.content_id)) AS key) WHERE key IS NOT NULL) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_segments_delete BEFORE DELETE ON segments
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT key FROM (SELECT 'page:' || COALESCE((SELECT id FROM pages WHERE id = OLD.content_id), (SELECT page_id FROM page_comments WHERE id = OLD.content_id)) AS key) WHERE key IS NOT NULL);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT key FROM (SELECT 'page:' || COALESCE((SELECT id FROM pages WHERE id = OLD.content_id), (SELECT page_id FROM page_comments WHERE id = OLD.content_id)) AS key) WHERE key IS NOT NULL) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_page_comments_insert AFTER INSERT ON page_comments
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT key FROM (SELECT 'page:' || NEW.page_id AS key) WHERE key IS NOT NULL);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT key FROM (SELECT 'page:' || NEW.page_id AS key) WHERE key IS NOT NULL) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_page_comments_update AFTER UPDATE ON page_comments
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT key FROM (SELECT 'page:' || OLD.page_id AS key) WHERE key IS NOT NULL UNION SELECT key FROM (SELECT 'page:' || NEW.page_id AS key) WHERE key IS NOT NULL);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT key FROM (SELECT 'page:' || OLD.page_id AS key) WHERE key IS NOT NULL UNION SELECT key FROM (SELECT 'page:' || NEW.page_id AS key) WHERE key IS NOT NULL) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_page_comments_delete BEFORE DELETE ON page_comments
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT key FROM (SELECT 'page:' || OLD.page_id AS key) WHERE key IS NOT NULL);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT key FROM (SELECT 'page:' || OLD.page_id AS key) WHERE key IS NOT NULL) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_tag_pages_insert AFTER INSERT ON tag_pages
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT key FROM (SELECT 'page:' || NEW.page_id AS key) WHERE key IS NOT NULL);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT key FROM (SELECT 'page:' || NEW.page_id AS key) WHERE key IS NOT NULL) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_tag_pages_update AFTER UPDATE ON tag_pages
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT key FROM (SELECT 'page:' || OLD.page_id AS key) WHERE key IS NOT NULL UNION SELECT key FROM (SELECT 'page:' || NEW.page_id AS key) WHERE key IS NOT NULL);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT key FROM (SELECT 'page:' || OLD.page_id AS key) WHERE key IS NOT NULL UNION SELECT key FROM (SELECT 'page:' || NEW.page_id AS key) WHERE key IS NOT NULL) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_tag_pages_delete BEFORE DELETE ON tag_pages
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT key FROM (SELECT 'page:' || OLD.page_id AS key) WHERE key IS NOT NULL);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT key FROM (SELECT 'page:' || OLD.page_id AS key) WHERE key IS NOT NULL) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_translation_jobs_insert AFTER INSERT ON translation_jobs
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT key FROM (SELECT 'page:' || NEW.page_id AS key) WHERE key IS NOT NULL);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT key FROM (SELECT 'page:' || NEW.page_id AS key) WHERE key IS NOT NULL) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_translation_jobs_update AFTER UPDATE ON translation_jobs
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT key FROM (SELECT 'page:' || OLD.page_id AS key) WHERE key IS NOT NULL UNION SELECT key FROM (SELECT 'page:' || NEW.page_id AS key) WHERE key IS NOT NULL);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT key FROM (SELECT 'page:' || OLD.page_id AS key) WHERE key IS NOT NULL UNION SELECT key FROM (SELECT 'page:' || NEW.page_id AS key) WHERE key IS NOT NULL) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_translation_jobs_delete BEFORE DELETE ON translation_jobs
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT key FROM (SELECT 'page:' || OLD.page_id AS key) WHERE key IS NOT NULL);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT key FROM (SELECT 'page:' || OLD.page_id AS key) WHERE key IS NOT NULL) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_page_locale_translation_proofs_insert AFTER INSERT ON page_locale_translation_proofs
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT key FROM (SELECT 'page:' || NEW.page_id AS key) WHERE key IS NOT NULL);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT key FROM (SELECT 'page:' || NEW.page_id AS key) WHERE key IS NOT NULL) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_page_locale_translation_proofs_update AFTER UPDATE ON page_locale_translation_proofs
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT key FROM (SELECT 'page:' || OLD.page_id AS key) WHERE key IS NOT NULL UNION SELECT key FROM (SELECT 'page:' || NEW.page_id AS key) WHERE key IS NOT NULL);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT key FROM (SELECT 'page:' || OLD.page_id AS key) WHERE key IS NOT NULL UNION SELECT key FROM (SELECT 'page:' || NEW.page_id AS key) WHERE key IS NOT NULL) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_page_locale_translation_proofs_delete BEFORE DELETE ON page_locale_translation_proofs
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT key FROM (SELECT 'page:' || OLD.page_id AS key) WHERE key IS NOT NULL);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT key FROM (SELECT 'page:' || OLD.page_id AS key) WHERE key IS NOT NULL) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_segment_translations_insert AFTER INSERT ON segment_translations
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT key FROM (SELECT 'page:' || COALESCE((SELECT id FROM pages WHERE id = (SELECT content_id FROM segments WHERE id = NEW.segment_id)), (SELECT page_id FROM page_comments WHERE id = (SELECT content_id FROM segments WHERE id = NEW.segment_id))) AS key) WHERE key IS NOT NULL);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT key FROM (SELECT 'page:' || COALESCE((SELECT id FROM pages WHERE id = (SELECT content_id FROM segments WHERE id = NEW.segment_id)), (SELECT page_id FROM page_comments WHERE id = (SELECT content_id FROM segments WHERE id = NEW.segment_id))) AS key) WHERE key IS NOT NULL) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_segment_translations_update AFTER UPDATE ON segment_translations
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT key FROM (SELECT 'page:' || COALESCE((SELECT id FROM pages WHERE id = (SELECT content_id FROM segments WHERE id = OLD.segment_id)), (SELECT page_id FROM page_comments WHERE id = (SELECT content_id FROM segments WHERE id = OLD.segment_id))) AS key) WHERE key IS NOT NULL UNION SELECT key FROM (SELECT 'page:' || COALESCE((SELECT id FROM pages WHERE id = (SELECT content_id FROM segments WHERE id = NEW.segment_id)), (SELECT page_id FROM page_comments WHERE id = (SELECT content_id FROM segments WHERE id = NEW.segment_id))) AS key) WHERE key IS NOT NULL);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT key FROM (SELECT 'page:' || COALESCE((SELECT id FROM pages WHERE id = (SELECT content_id FROM segments WHERE id = OLD.segment_id)), (SELECT page_id FROM page_comments WHERE id = (SELECT content_id FROM segments WHERE id = OLD.segment_id))) AS key) WHERE key IS NOT NULL UNION SELECT key FROM (SELECT 'page:' || COALESCE((SELECT id FROM pages WHERE id = (SELECT content_id FROM segments WHERE id = NEW.segment_id)), (SELECT page_id FROM page_comments WHERE id = (SELECT content_id FROM segments WHERE id = NEW.segment_id))) AS key) WHERE key IS NOT NULL) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_segment_translations_delete BEFORE DELETE ON segment_translations
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT key FROM (SELECT 'page:' || COALESCE((SELECT id FROM pages WHERE id = (SELECT content_id FROM segments WHERE id = OLD.segment_id)), (SELECT page_id FROM page_comments WHERE id = (SELECT content_id FROM segments WHERE id = OLD.segment_id))) AS key) WHERE key IS NOT NULL);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT key FROM (SELECT 'page:' || COALESCE((SELECT id FROM pages WHERE id = (SELECT content_id FROM segments WHERE id = OLD.segment_id)), (SELECT page_id FROM page_comments WHERE id = (SELECT content_id FROM segments WHERE id = OLD.segment_id))) AS key) WHERE key IS NOT NULL) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_translation_votes_insert AFTER INSERT ON translation_votes
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT key FROM (SELECT 'page:' || COALESCE((SELECT id FROM pages WHERE id = (SELECT content_id FROM segments WHERE id = (SELECT segment_id FROM segment_translations WHERE id = NEW.translation_id))), (SELECT page_id FROM page_comments WHERE id = (SELECT content_id FROM segments WHERE id = (SELECT segment_id FROM segment_translations WHERE id = NEW.translation_id)))) AS key) WHERE key IS NOT NULL);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT key FROM (SELECT 'page:' || COALESCE((SELECT id FROM pages WHERE id = (SELECT content_id FROM segments WHERE id = (SELECT segment_id FROM segment_translations WHERE id = NEW.translation_id))), (SELECT page_id FROM page_comments WHERE id = (SELECT content_id FROM segments WHERE id = (SELECT segment_id FROM segment_translations WHERE id = NEW.translation_id)))) AS key) WHERE key IS NOT NULL) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_translation_votes_update AFTER UPDATE ON translation_votes
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT key FROM (SELECT 'page:' || COALESCE((SELECT id FROM pages WHERE id = (SELECT content_id FROM segments WHERE id = (SELECT segment_id FROM segment_translations WHERE id = OLD.translation_id))), (SELECT page_id FROM page_comments WHERE id = (SELECT content_id FROM segments WHERE id = (SELECT segment_id FROM segment_translations WHERE id = OLD.translation_id)))) AS key) WHERE key IS NOT NULL UNION SELECT key FROM (SELECT 'page:' || COALESCE((SELECT id FROM pages WHERE id = (SELECT content_id FROM segments WHERE id = (SELECT segment_id FROM segment_translations WHERE id = NEW.translation_id))), (SELECT page_id FROM page_comments WHERE id = (SELECT content_id FROM segments WHERE id = (SELECT segment_id FROM segment_translations WHERE id = NEW.translation_id)))) AS key) WHERE key IS NOT NULL);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT key FROM (SELECT 'page:' || COALESCE((SELECT id FROM pages WHERE id = (SELECT content_id FROM segments WHERE id = (SELECT segment_id FROM segment_translations WHERE id = OLD.translation_id))), (SELECT page_id FROM page_comments WHERE id = (SELECT content_id FROM segments WHERE id = (SELECT segment_id FROM segment_translations WHERE id = OLD.translation_id)))) AS key) WHERE key IS NOT NULL UNION SELECT key FROM (SELECT 'page:' || COALESCE((SELECT id FROM pages WHERE id = (SELECT content_id FROM segments WHERE id = (SELECT segment_id FROM segment_translations WHERE id = NEW.translation_id))), (SELECT page_id FROM page_comments WHERE id = (SELECT content_id FROM segments WHERE id = (SELECT segment_id FROM segment_translations WHERE id = NEW.translation_id)))) AS key) WHERE key IS NOT NULL) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_translation_votes_delete BEFORE DELETE ON translation_votes
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT key FROM (SELECT 'page:' || COALESCE((SELECT id FROM pages WHERE id = (SELECT content_id FROM segments WHERE id = (SELECT segment_id FROM segment_translations WHERE id = OLD.translation_id))), (SELECT page_id FROM page_comments WHERE id = (SELECT content_id FROM segments WHERE id = (SELECT segment_id FROM segment_translations WHERE id = OLD.translation_id)))) AS key) WHERE key IS NOT NULL);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT key FROM (SELECT 'page:' || COALESCE((SELECT id FROM pages WHERE id = (SELECT content_id FROM segments WHERE id = (SELECT segment_id FROM segment_translations WHERE id = OLD.translation_id))), (SELECT page_id FROM page_comments WHERE id = (SELECT content_id FROM segments WHERE id = (SELECT segment_id FROM segment_translations WHERE id = OLD.translation_id)))) AS key) WHERE key IS NOT NULL) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_tags_update AFTER UPDATE ON tags
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT key FROM (SELECT 'page:' || page_id AS key FROM tag_pages WHERE tag_id = OLD.id) WHERE key IS NOT NULL UNION SELECT key FROM (SELECT 'page:' || page_id AS key FROM tag_pages WHERE tag_id = NEW.id) WHERE key IS NOT NULL);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT key FROM (SELECT 'page:' || page_id AS key FROM tag_pages WHERE tag_id = OLD.id) WHERE key IS NOT NULL UNION SELECT key FROM (SELECT 'page:' || page_id AS key FROM tag_pages WHERE tag_id = NEW.id) WHERE key IS NOT NULL) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_tags_delete BEFORE DELETE ON tags
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT key FROM (SELECT 'page:' || page_id AS key FROM tag_pages WHERE tag_id = OLD.id) WHERE key IS NOT NULL);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT key FROM (SELECT 'page:' || page_id AS key FROM tag_pages WHERE tag_id = OLD.id) WHERE key IS NOT NULL) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_users_insert AFTER INSERT ON users
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT key FROM (SELECT 'user:' || NEW.id AS key) WHERE key IS NOT NULL);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT key FROM (SELECT 'user:' || NEW.id AS key) WHERE key IS NOT NULL) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_users_update AFTER UPDATE ON users WHEN OLD.name IS NOT NEW.name OR OLD.handle IS NOT NEW.handle OR OLD.image IS NOT NEW.image OR OLD.profile IS NOT NEW.profile OR OLD.twitter_handle IS NOT NEW.twitter_handle
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*';
  INSERT INTO reader_revisions (key, revision)
    SELECT 'user:' || NEW.id, revision FROM reader_revisions WHERE key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_users_delete BEFORE DELETE ON users
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT key FROM (SELECT 'user:' || OLD.id AS key) WHERE key IS NOT NULL);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT key FROM (SELECT 'user:' || OLD.id AS key) WHERE key IS NOT NULL) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_follows_insert AFTER INSERT ON follows
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*';
END;

--> statement-breakpoint
CREATE TRIGGER reader_nav_pages_insert AFTER INSERT ON pages
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT 'nav:' || NEW.id AS key);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT 'nav:' || NEW.id AS key) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_nav_pages_update AFTER UPDATE ON pages WHEN OLD.slug IS NOT NEW.slug OR OLD.parent_id IS NOT NEW.parent_id OR OLD."order" IS NOT NEW."order" OR OLD.status IS NOT NEW.status OR OLD.user_id IS NOT NEW.user_id
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT 'nav:' || OLD.id AS key UNION SELECT 'nav:' || NEW.id AS key);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT 'nav:' || OLD.id AS key UNION SELECT 'nav:' || NEW.id AS key) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_nav_pages_delete BEFORE DELETE ON pages
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT 'nav:' || OLD.id AS key);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT 'nav:' || OLD.id AS key) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_nav_segments_insert AFTER INSERT ON segments
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT 'nav:' || NEW.content_id AS key WHERE NEW.number = 0 AND EXISTS (SELECT 1 FROM pages WHERE id = NEW.content_id));
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT 'nav:' || NEW.content_id AS key WHERE NEW.number = 0 AND EXISTS (SELECT 1 FROM pages WHERE id = NEW.content_id)) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_nav_segments_update AFTER UPDATE ON segments WHEN OLD.number IS NOT NEW.number OR OLD.content_id IS NOT NEW.content_id OR OLD.text IS NOT NEW.text
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT 'nav:' || OLD.content_id AS key WHERE OLD.number = 0 AND EXISTS (SELECT 1 FROM pages WHERE id = OLD.content_id) UNION SELECT 'nav:' || NEW.content_id AS key WHERE NEW.number = 0 AND EXISTS (SELECT 1 FROM pages WHERE id = NEW.content_id));
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT 'nav:' || OLD.content_id AS key WHERE OLD.number = 0 AND EXISTS (SELECT 1 FROM pages WHERE id = OLD.content_id) UNION SELECT 'nav:' || NEW.content_id AS key WHERE NEW.number = 0 AND EXISTS (SELECT 1 FROM pages WHERE id = NEW.content_id)) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_nav_segments_delete BEFORE DELETE ON segments
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT 'nav:' || OLD.content_id AS key WHERE OLD.number = 0 AND EXISTS (SELECT 1 FROM pages WHERE id = OLD.content_id));
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT 'nav:' || OLD.content_id AS key WHERE OLD.number = 0 AND EXISTS (SELECT 1 FROM pages WHERE id = OLD.content_id)) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_nav_segment_translations_insert AFTER INSERT ON segment_translations
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT 'nav:' || content_id AS key FROM segments JOIN pages ON pages.id = segments.content_id WHERE segments.id = NEW.segment_id AND segments.number = 0);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT 'nav:' || content_id AS key FROM segments JOIN pages ON pages.id = segments.content_id WHERE segments.id = NEW.segment_id AND segments.number = 0) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_nav_segment_translations_update AFTER UPDATE ON segment_translations
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT 'nav:' || content_id AS key FROM segments JOIN pages ON pages.id = segments.content_id WHERE segments.id = OLD.segment_id AND segments.number = 0 UNION SELECT 'nav:' || content_id AS key FROM segments JOIN pages ON pages.id = segments.content_id WHERE segments.id = NEW.segment_id AND segments.number = 0);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT 'nav:' || content_id AS key FROM segments JOIN pages ON pages.id = segments.content_id WHERE segments.id = OLD.segment_id AND segments.number = 0 UNION SELECT 'nav:' || content_id AS key FROM segments JOIN pages ON pages.id = segments.content_id WHERE segments.id = NEW.segment_id AND segments.number = 0) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_nav_segment_translations_delete BEFORE DELETE ON segment_translations
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*' AND EXISTS (SELECT 'nav:' || content_id AS key FROM segments JOIN pages ON pages.id = segments.content_id WHERE segments.id = OLD.segment_id AND segments.number = 0);
  INSERT INTO reader_revisions (key, revision)
    SELECT changed.key, counter.revision FROM (SELECT 'nav:' || content_id AS key FROM segments JOIN pages ON pages.id = segments.content_id WHERE segments.id = OLD.segment_id AND segments.number = 0) AS changed CROSS JOIN reader_revisions AS counter WHERE counter.key = '*'
    ON CONFLICT (key) DO UPDATE SET revision = excluded.revision;
END;
--> statement-breakpoint
CREATE TRIGGER reader_follows_update AFTER UPDATE ON follows
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*';
END;
--> statement-breakpoint
CREATE TRIGGER reader_follows_delete BEFORE DELETE ON follows
BEGIN
  UPDATE reader_revisions SET revision = revision + 1 WHERE key = '*';
END;

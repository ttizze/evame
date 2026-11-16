CREATE TABLE reader_publication_changes (
 key TEXT PRIMARY KEY NOT NULL,
 revision INTEGER NOT NULL
);
--> statement-breakpoint
DROP TABLE reader_cache_invalidations;
--> statement-breakpoint
CREATE TRIGGER reader_publication_insert AFTER INSERT ON reader_revisions
WHEN NEW.key != '*'
BEGIN
 INSERT INTO reader_publication_changes (key, revision) VALUES (NEW.key, NEW.revision)
 ON CONFLICT (key) DO UPDATE SET revision = MAX(revision, excluded.revision);
 INSERT INTO reader_publication_changes (key, revision) VALUES ('about', NEW.revision)
 ON CONFLICT (key) DO UPDATE SET revision = MAX(revision, excluded.revision);
END;
--> statement-breakpoint
CREATE TRIGGER reader_publication_update AFTER UPDATE ON reader_revisions
WHEN NEW.key != '*'
BEGIN
 INSERT INTO reader_publication_changes (key, revision) VALUES (NEW.key, NEW.revision)
 ON CONFLICT (key) DO UPDATE SET revision = MAX(revision, excluded.revision);
 INSERT INTO reader_publication_changes (key, revision) VALUES ('about', NEW.revision)
 ON CONFLICT (key) DO UPDATE SET revision = MAX(revision, excluded.revision);
END;

CREATE TABLE `__new_notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`read` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`actor_id` text NOT NULL,
	`page_comment_id` integer,
	`page_id` integer,
	`segment_translation_id` integer,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`page_comment_id`) REFERENCES `page_comments`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`segment_translation_id`) REFERENCES `segment_translations`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "notifications_enum_check" CHECK("__new_notifications"."type" IN ('FOLLOW', 'PAGE_COMMENT', 'PAGE_LIKE', 'PAGE_PUBLISHED', 'PAGE_SEGMENT_TRANSLATION_VOTE', 'PAGE_COMMENT_SEGMENT_TRANSLATION_VOTE'))
);
--> statement-breakpoint
INSERT INTO `__new_notifications`("id", "user_id", "type", "read", "created_at", "actor_id", "page_comment_id", "page_id", "segment_translation_id") SELECT "id", "user_id", "type", "read", "created_at", "actor_id", "page_comment_id", "page_id", "segment_translation_id" FROM `notifications`;--> statement-breakpoint
UPDATE `sqlite_sequence` SET `seq` = MAX(`seq`, COALESCE((SELECT `seq` FROM `sqlite_sequence` WHERE `name` = 'notifications'), 0)) WHERE `name` = '__new_notifications';--> statement-breakpoint
DROP TABLE `notifications`;--> statement-breakpoint
ALTER TABLE `__new_notifications` RENAME TO `notifications`;--> statement-breakpoint
CREATE INDEX `notifications_actor_id_idx` ON `notifications` (`actor_id`);--> statement-breakpoint
CREATE INDEX `notifications_user_id_idx` ON `notifications` (`user_id`);--> statement-breakpoint
ALTER TABLE `pages` ADD `publication_notified` integer DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE `pages` SET `publication_notified` = true WHERE `status` = 'PUBLIC' OR `published_at` IS NOT NULL;

CREATE TABLE `accounts` (
	`user_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`account_id` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`scope` text,
	`id_token` text,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`password` text,
	`refresh_token_expires_at` integer,
	`updated_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`access_token_expires_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_provider_accountId_key` ON `accounts` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE TABLE `contents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`updated_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`import_file_id` integer,
	FOREIGN KEY (`import_file_id`) REFERENCES `import_files`(`id`) ON UPDATE cascade ON DELETE set null,
	CONSTRAINT "contents_enum_check" CHECK("contents"."kind" IN ('PAGE', 'PAGE_COMMENT'))
);
--> statement-breakpoint
CREATE INDEX `contents_kind_idx` ON `contents` (`kind`);--> statement-breakpoint
CREATE TABLE `follows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`follower_id` text NOT NULL,
	`following_id` text NOT NULL,
	FOREIGN KEY (`follower_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`following_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `follows_follower_id_idx` ON `follows` (`follower_id`);--> statement-breakpoint
CREATE INDEX `follows_following_id_idx` ON `follows` (`following_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `follows_follower_id_following_id_key` ON `follows` (`follower_id`,`following_id`);--> statement-breakpoint
CREATE TABLE `gemini_api_keys` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`api_key` text DEFAULT '' NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gemini_api_keys_user_id_idx` ON `gemini_api_keys` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `gemini_api_keys_user_id_key` ON `gemini_api_keys` (`user_id`);--> statement-breakpoint
CREATE TABLE `import_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`import_run_id` integer NOT NULL,
	`path` text NOT NULL,
	`checksum` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	FOREIGN KEY (`import_run_id`) REFERENCES `import_runs`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `import_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`started_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`finished_at` integer,
	`status` text DEFAULT 'RUNNING' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `like_pages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`page_id` integer NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`user_id` text,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `like_pages_page_id_idx` ON `like_pages` (`page_id`);--> statement-breakpoint
CREATE INDEX `like_pages_user_id_idx` ON `like_pages` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `like_pages_user_id_page_id_key` ON `like_pages` (`user_id`,`page_id`);--> statement-breakpoint
CREATE TABLE `notifications` (
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
	CONSTRAINT "notifications_enum_check" CHECK("notifications"."type" IN ('FOLLOW', 'PAGE_COMMENT', 'PAGE_LIKE', 'PAGE_SEGMENT_TRANSLATION_VOTE', 'PAGE_COMMENT_SEGMENT_TRANSLATION_VOTE'))
);
--> statement-breakpoint
CREATE INDEX `notifications_actor_id_idx` ON `notifications` (`actor_id`);--> statement-breakpoint
CREATE INDEX `notifications_user_id_idx` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE TABLE `page_comments` (
	`id` integer PRIMARY KEY NOT NULL,
	`page_id` integer NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`updated_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`locale` text NOT NULL,
	`user_id` text NOT NULL,
	`parent_id` integer,
	`mdast_json` text NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`last_reply_at` integer,
	`reply_count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`id`) REFERENCES `contents`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `page_comments`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `page_comments_page_id_parent_id_created_at_idx` ON `page_comments` (`page_id`,`parent_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `page_comments_parent_id_is_deleted_created_at_idx` ON `page_comments` (`parent_id`,`is_deleted`,`created_at`);--> statement-breakpoint
CREATE INDEX `page_comments_user_id_idx` ON `page_comments` (`user_id`);--> statement-breakpoint
CREATE TABLE `page_locale_translation_proofs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`page_id` integer NOT NULL,
	`locale` text NOT NULL,
	`translation_proof_status` text DEFAULT 'MACHINE_DRAFT' NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "pageLocaleTranslationProofs_enum_check" CHECK("page_locale_translation_proofs"."translation_proof_status" IN ('MACHINE_DRAFT', 'HUMAN_TOUCHED', 'PROOFREAD', 'VALIDATED'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `page_locale_translation_proofs_page_id_locale_key` ON `page_locale_translation_proofs` (`page_id`,`locale`);--> statement-breakpoint
CREATE INDEX `page_locale_translation_proofs_translation_proof_status_idx` ON `page_locale_translation_proofs` (`translation_proof_status`);--> statement-breakpoint
CREATE TABLE `page_views` (
	`page_id` integer PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pages` (
	`id` integer PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`source_locale` text DEFAULT 'unknown' NOT NULL,
	`updated_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`user_id` text NOT NULL,
	`mdast_json` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`parent_id` integer,
	`published_at` integer,
	`archived_at` integer,
	FOREIGN KEY (`id`) REFERENCES `contents`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `pages`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "pages_enum_check" CHECK("pages"."status" IN ('DRAFT', 'PUBLIC', 'ARCHIVE'))
);
--> statement-breakpoint
CREATE INDEX `pages_created_at_idx` ON `pages` (`created_at`);--> statement-breakpoint
CREATE INDEX `pages_parent_id_idx` ON `pages` (`parent_id`);--> statement-breakpoint
CREATE INDEX `pages_parent_id_order_idx` ON `pages` (`parent_id`,`order`);--> statement-breakpoint
CREATE INDEX `pages_slug_idx` ON `pages` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `pages_slug_key` ON `pages` (`slug`);--> statement-breakpoint
CREATE INDEX `pages_status_created_at_idx` ON `pages` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `pages_status_parent_id_created_at_idx` ON `pages` (`status`,`parent_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `pages_user_id_idx` ON `pages` (`user_id`);--> statement-breakpoint
CREATE TABLE `personal_access_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key_hash` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`last_used_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `personal_access_tokens_key_hash_key` ON `personal_access_tokens` (`key_hash`);--> statement-breakpoint
CREATE INDEX `personal_access_tokens_user_id_idx` ON `personal_access_tokens` (`user_id`);--> statement-breakpoint
CREATE TABLE `segment_translations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`segment_id` integer NOT NULL,
	`locale` text NOT NULL,
	`text` text NOT NULL,
	`point` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`segment_id`) REFERENCES `segments`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `segment_translations_segment_id_locale_idx` ON `segment_translations` (`segment_id`,`locale`);--> statement-breakpoint
CREATE INDEX `segment_translations_user_id_idx` ON `segment_translations` (`user_id`);--> statement-breakpoint
CREATE TABLE `segments` (
	`search_text` text DEFAULT '' NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_id` integer NOT NULL,
	`number` integer NOT NULL,
	`text` text NOT NULL,
	`text_and_occurrence_hash` text NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	FOREIGN KEY (`content_id`) REFERENCES `contents`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `segments_content_id_idx` ON `segments` (`content_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `segments_content_id_number_key` ON `segments` (`content_id`,`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `segments_content_id_text_and_occurrence_hash_key` ON `segments` (`content_id`,`text_and_occurrence_hash`);--> statement-breakpoint
CREATE INDEX `segments_text_and_occurrence_hash_idx` ON `segments` (`text_and_occurrence_hash`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`ip_address` text,
	`updated_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`user_agent` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_key` ON `sessions` (`token`);--> statement-breakpoint
CREATE TABLE `tag_pages` (
	`tag_id` integer NOT NULL,
	`page_id` integer NOT NULL,
	PRIMARY KEY(`tag_id`, `page_id`),
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tag_pages_pageId_idx` ON `tag_pages` (`page_id`);--> statement-breakpoint
CREATE INDEX `tag_pages_tagId_idx` ON `tag_pages` (`tag_id`);--> statement-breakpoint
CREATE TABLE `tags` (
	`search_name` text DEFAULT '' NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `tags_name_idx` ON `tags` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_key` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE `translation_contexts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`context` text NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`updated_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `translation_contexts_user_id_idx` ON `translation_contexts` (`user_id`);--> statement-breakpoint
CREATE TABLE `translation_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`page_id` integer NOT NULL,
	`user_id` text,
	`locale` text NOT NULL,
	`ai_model` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`error` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`updated_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE set null,
	CONSTRAINT "translationJobs_enum_check" CHECK("translation_jobs"."status" IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'))
);
--> statement-breakpoint
CREATE INDEX `translation_jobs_userId_idx` ON `translation_jobs` (`user_id`);--> statement-breakpoint
CREATE TABLE `translation_votes` (
	`translation_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`is_upvote` integer NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`updated_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	FOREIGN KEY (`translation_id`) REFERENCES `segment_translations`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `translation_votes_translation_id_idx` ON `translation_votes` (`translation_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `translation_votes_translation_id_user_id_key` ON `translation_votes` (`translation_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `translation_votes_user_id_idx` ON `translation_votes` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`target_locales` text DEFAULT '["RAY"]' NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`updated_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_settings_user_id_key` ON `user_settings` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`search_name` text DEFAULT 'new_user' NOT NULL,
	`image` text DEFAULT 'https://evame.tech/avatar.png' NOT NULL,
	`plan` text DEFAULT 'free' NOT NULL,
	`total_points` integer DEFAULT 0 NOT NULL,
	`is_ai` integer DEFAULT false NOT NULL,
	`provider` text DEFAULT 'Credentials' NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`updated_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`name` text DEFAULT 'new_user' NOT NULL,
	`handle` text NOT NULL,
	`profile` text DEFAULT '' NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`twitter_handle` text DEFAULT '' NOT NULL,
	`email_verified` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_key` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_handle_key` ON `users` (`handle`);--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);

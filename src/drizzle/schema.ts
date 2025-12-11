import { createId } from "@paralleldrive/cuid2";
import {
	boolean,
	foreignKey,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	serial,
	text,
	timestamp,
	unique,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import type { Root as MdastRoot } from "mdast";

export const contentKind = pgEnum("ContentKind", ["PAGE", "PAGE_COMMENT"]);
export const notificationType = pgEnum("NotificationType", [
	"FOLLOW",
	"PAGE_COMMENT",
	"PAGE_LIKE",
	"PAGE_SEGMENT_TRANSLATION_VOTE",
	"PAGE_COMMENT_SEGMENT_TRANSLATION_VOTE",
]);
export const pageStatus = pgEnum("PageStatus", ["DRAFT", "PUBLIC", "ARCHIVE"]);
export const segmentTypeKey = pgEnum("SegmentTypeKey", [
	"PRIMARY",
	"COMMENTARY",
]);
export const translationProofStatus = pgEnum("TranslationProofStatus", [
	"MACHINE_DRAFT",
	"HUMAN_TOUCHED",
	"PROOFREAD",
	"VALIDATED",
]);
export const translationStatus = pgEnum("TranslationStatus", [
	"PENDING",
	"IN_PROGRESS",
	"COMPLETED",
	"FAILED",
]);

export const verifications = pgTable("verifications", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp("expires_at", {
		precision: 3,
		mode: "date",
	}).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: "date" }),
	updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).$onUpdate(
		() => new Date(),
	),
});

export const follows = pgTable(
	"follows",
	{
		id: serial().primaryKey().notNull(),
		createdAt: timestamp("created_at", { precision: 3, mode: "date" })
			.defaultNow()
			.notNull(),
		followerId: text("follower_id").notNull(),
		followingId: text("following_id").notNull(),
	},
	(table) => [
		index("follows_follower_id_idx").using(
			"btree",
			table.followerId.asc().nullsLast(),
		),
		index("follows_following_id_idx").using(
			"btree",
			table.followingId.asc().nullsLast(),
		),
		foreignKey({
			columns: [table.followerId],
			foreignColumns: [users.id],
			name: "follows_follower_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.followingId],
			foreignColumns: [users.id],
			name: "follows_following_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		unique("follows_follower_id_following_id_key").on(
			table.followerId,
			table.followingId,
		),
	],
);

export const likePages = pgTable(
	"like_pages",
	{
		id: serial().primaryKey().notNull(),
		pageId: integer("page_id").notNull(),
		createdAt: timestamp("created_at", { precision: 3, mode: "date" })
			.defaultNow()
			.notNull(),
		userId: text("user_id"),
	},
	(table) => [
		index("like_pages_page_id_idx").using(
			"btree",
			table.pageId.asc().nullsLast(),
		),
		index("like_pages_user_id_idx").using(
			"btree",
			table.userId.asc().nullsLast(),
		),
		uniqueIndex("like_pages_user_id_page_id_key").using(
			"btree",
			table.userId.asc().nullsLast(),
			table.pageId.asc().nullsLast(),
		),
		foreignKey({
			columns: [table.pageId],
			foreignColumns: [pages.id],
			name: "like_pages_page_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "like_pages_user_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const importFiles = pgTable(
	"import_files",
	{
		id: serial().primaryKey().notNull(),
		importRunId: integer("import_run_id").notNull(),
		path: text().notNull(),
		checksum: text().notNull(),
		status: text().default("PENDING").notNull(),
		message: text().default("").notNull(),
		createdAt: timestamp("created_at", { precision: 3, mode: "date" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.importRunId],
			foreignColumns: [importRuns.id],
			name: "import_files_import_run_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const contents = pgTable(
	"contents",
	{
		id: serial().primaryKey().notNull(),
		kind: contentKind().notNull(),
		createdAt: timestamp("created_at", { precision: 3, mode: "date" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
		importFileId: integer("import_file_id"),
	},
	(table) => [
		index("contents_kind_idx").using("btree", table.kind.asc().nullsLast()),
		foreignKey({
			columns: [table.importFileId],
			foreignColumns: [importFiles.id],
			name: "contents_import_file_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);

export const geminiApiKeys = pgTable(
	"gemini_api_keys",
	{
		id: serial().primaryKey().notNull(),
		apiKey: text("api_key").default("").notNull(),
		userId: text("user_id").notNull(),
	},
	(table) => [
		index("gemini_api_keys_user_id_idx").using(
			"btree",
			table.userId.asc().nullsLast(),
		),
		uniqueIndex("gemini_api_keys_user_id_key").using(
			"btree",
			table.userId.asc().nullsLast(),
		),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "gemini_api_keys_user_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const importRuns = pgTable("import_runs", {
	id: serial().primaryKey().notNull(),
	startedAt: timestamp("started_at", { precision: 3, mode: "date" })
		.defaultNow()
		.notNull(),
	finishedAt: timestamp("finished_at", { precision: 3, mode: "date" }),
	status: text().default("RUNNING").notNull(),
});

export const notifications = pgTable(
	"notifications",
	{
		id: serial().primaryKey().notNull(),
		userId: text("user_id").notNull(),
		type: notificationType().notNull(),
		read: boolean().default(false).notNull(),
		createdAt: timestamp("created_at", { precision: 3, mode: "date" })
			.defaultNow()
			.notNull(),
		actorId: text("actor_id").notNull(),
		pageCommentId: integer("page_comment_id"),
		pageId: integer("page_id"),
		segmentTranslationId: integer("segment_translation_id"),
	},
	(table) => [
		index("notifications_actor_id_idx").using(
			"btree",
			table.actorId.asc().nullsLast(),
		),
		index("notifications_user_id_idx").using(
			"btree",
			table.userId.asc().nullsLast(),
		),
		foreignKey({
			columns: [table.actorId],
			foreignColumns: [users.id],
			name: "notifications_actor_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.pageCommentId],
			foreignColumns: [pageComments.id],
			name: "notifications_page_comment_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.pageId],
			foreignColumns: [pages.id],
			name: "notifications_page_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.segmentTranslationId],
			foreignColumns: [segmentTranslations.id],
			name: "notifications_segment_translation_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notifications_user_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const segmentTypes = pgTable(
	"segment_types",
	{
		id: serial().primaryKey().notNull(),
		label: text().notNull(),
		key: segmentTypeKey().notNull(),
	},
	(table) => [
		index("segment_types_key_idx").using("btree", table.key.asc().nullsLast()),
		uniqueIndex("segment_types_key_label_key").using(
			"btree",
			table.key.asc().nullsLast(),
			table.label.asc().nullsLast(),
		),
		index("segment_types_label_idx").using(
			"btree",
			table.label.asc().nullsLast(),
		),
	],
);

export const accounts = pgTable(
	"accounts",
	{
		userId: text("user_id").notNull(),
		providerId: text("provider_id").notNull(),
		accountId: text("account_id").notNull(),
		refreshToken: text("refresh_token"),
		accessToken: text("access_token"),
		scope: text(),
		idToken: text("id_token"),
		createdAt: timestamp("created_at", { precision: 3, mode: "date" })
			.defaultNow()
			.notNull(),
		id: text()
			.$defaultFn(() => createId())
			.primaryKey()
			.notNull(),
		password: text(),
		refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
			precision: 3,
			mode: "date",
		}),
		updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
		accessTokenExpiresAt: timestamp("access_token_expires_at", {
			precision: 3,
			mode: "date",
		}),
	},
	(table) => [
		uniqueIndex("accounts_provider_accountId_key").using(
			"btree",
			table.providerId.asc().nullsLast(),
			table.accountId.asc().nullsLast(),
		),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "accounts_userId_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const translationJobs = pgTable(
	"translation_jobs",
	{
		id: serial().primaryKey().notNull(),
		pageId: integer("page_id").notNull(),
		userId: text("user_id"),
		locale: text().notNull(),
		aiModel: text("ai_model").notNull(),
		status: translationStatus().default("PENDING").notNull(),
		progress: integer().default(0).notNull(),
		error: text().default("").notNull(),
		createdAt: timestamp("created_at", { precision: 3, mode: "date" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		index("translation_jobs_userId_idx").using(
			"btree",
			table.userId.asc().nullsLast(),
		),
		foreignKey({
			columns: [table.pageId],
			foreignColumns: [pages.id],
			name: "translation_jobs_pageId_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "translation_jobs_userId_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
	],
);

export const pageViews = pgTable(
	"page_views",
	{
		pageId: integer("page_id").primaryKey().notNull(),
		count: integer().default(0).notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.pageId],
			foreignColumns: [pages.id],
			name: "page_views_pageId_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const sessions = pgTable(
	"sessions",
	{
		token: text().notNull(),
		userId: text("user_id").notNull(),
		expiresAt: timestamp("expires_at", {
			precision: 3,
			mode: "date",
		}).notNull(),
		createdAt: timestamp("created_at", { precision: 3, mode: "date" })
			.defaultNow()
			.notNull(),
		id: text()
			.$defaultFn(() => createId())
			.primaryKey()
			.notNull(),
		ipAddress: text("ip_address"),
		updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
		userAgent: text("user_agent"),
	},
	(table) => [
		uniqueIndex("sessions_token_key").using(
			"btree",
			table.token.asc().nullsLast(),
		),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_userId_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const tags = pgTable(
	"tags",
	{
		id: serial().primaryKey().notNull(),
		name: text().notNull(),
	},
	(table) => [
		index("tags_name_idx").using("btree", table.name.asc().nullsLast()),
		uniqueIndex("tags_name_key").using("btree", table.name.asc().nullsLast()),
	],
);

export const pageLocaleTranslationProofs = pgTable(
	"page_locale_translation_proofs",
	{
		id: serial().primaryKey().notNull(),
		pageId: integer("page_id").notNull(),
		locale: text().notNull(),
		translationProofStatus: translationProofStatus("translation_proof_status")
			.default("MACHINE_DRAFT")
			.notNull(),
	},
	(table) => [
		uniqueIndex("page_locale_translation_proofs_page_id_locale_key").using(
			"btree",
			table.pageId.asc().nullsLast(),
			table.locale.asc().nullsLast(),
		),
		index("page_locale_translation_proofs_translation_proof_status_idx").using(
			"btree",
			table.translationProofStatus.asc().nullsLast(),
		),
		foreignKey({
			columns: [table.pageId],
			foreignColumns: [pages.id],
			name: "page_locale_translation_proofs_page_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const segmentMetadataTypes = pgTable(
	"segment_metadata_types",
	{
		id: serial().primaryKey().notNull(),
		key: text().notNull(),
		label: text().notNull(),
	},
	(table) => [
		uniqueIndex("segment_metadata_types_key_key").using(
			"btree",
			table.key.asc().nullsLast(),
		),
	],
);

export const translationVotes = pgTable(
	"translation_votes",
	{
		translationId: integer("translation_id").notNull(),
		userId: text("user_id").notNull(),
		isUpvote: boolean("is_upvote").notNull(),
		createdAt: timestamp("created_at", { precision: 3, mode: "date" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		index("translation_votes_translation_id_idx").using(
			"btree",
			table.translationId.asc().nullsLast(),
		),
		uniqueIndex("translation_votes_translation_id_user_id_key").using(
			"btree",
			table.translationId.asc().nullsLast(),
			table.userId.asc().nullsLast(),
		),
		index("translation_votes_user_id_idx").using(
			"btree",
			table.userId.asc().nullsLast(),
		),
		foreignKey({
			columns: [table.translationId],
			foreignColumns: [segmentTranslations.id],
			name: "translation_votes_translation_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "translation_votes_user_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const userCredentials = pgTable(
	"user_credentials",
	{
		id: serial().primaryKey().notNull(),
		password: text().notNull(),
		userId: text("user_id").notNull(),
	},
	(table) => [
		index("user_credentials_user_id_idx").using(
			"btree",
			table.userId.asc().nullsLast(),
		),
		uniqueIndex("user_credentials_user_id_key").using(
			"btree",
			table.userId.asc().nullsLast(),
		),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_credentials_user_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
	],
);

export const segmentTranslations = pgTable(
	"segment_translations",
	{
		id: serial().primaryKey().notNull(),
		segmentId: integer("segment_id").notNull(),
		locale: text().notNull(),
		text: text().notNull(),
		point: integer().default(0).notNull(),
		createdAt: timestamp("created_at", { precision: 3, mode: "date" })
			.defaultNow()
			.notNull(),
		userId: text("user_id").notNull(),
	},
	(table) => [
		index("segment_translations_segment_id_locale_idx").using(
			"btree",
			table.segmentId.asc().nullsLast(),
			table.locale.asc().nullsLast(),
		),
		index("segment_translations_user_id_idx").using(
			"btree",
			table.userId.asc().nullsLast(),
		),
		foreignKey({
			columns: [table.segmentId],
			foreignColumns: [segments.id],
			name: "segment_translations_segment_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "segment_translations_user_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const pageComments = pgTable(
	"page_comments",
	{
		id: integer().primaryKey().notNull(),
		pageId: integer("page_id").notNull(),
		createdAt: timestamp("created_at", { precision: 3, mode: "date" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
		locale: text().notNull(),
		userId: text("user_id").notNull(),
		parentId: integer("parent_id"),
		mdastJson: jsonb("mdast_json").$type<MdastRoot>().notNull(),
		isDeleted: boolean("is_deleted").default(false).notNull(),
		lastReplyAt: timestamp("last_reply_at", { precision: 3, mode: "date" }),
		replyCount: integer("reply_count").default(0).notNull(),
	},
	(table) => [
		index("page_comments_page_id_parent_id_created_at_idx").using(
			"btree",
			table.pageId.asc().nullsLast(),
			table.parentId.asc().nullsLast(),
			table.createdAt.asc().nullsLast(),
		),
		index("page_comments_parent_id_is_deleted_created_at_idx").using(
			"btree",
			table.parentId.asc().nullsLast(),
			table.isDeleted.asc().nullsLast(),
			table.createdAt.asc().nullsLast(),
		),
		index("page_comments_user_id_idx").using(
			"btree",
			table.userId.asc().nullsLast(),
		),
		foreignKey({
			columns: [table.id],
			foreignColumns: [contents.id],
			name: "page_comments_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.pageId],
			foreignColumns: [pages.id],
			name: "page_comments_page_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "page_comments_parent_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "page_comments_user_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const pages = pgTable(
	"pages",
	{
		id: integer().primaryKey().notNull(),
		slug: text().notNull(),
		createdAt: timestamp("created_at", { precision: 3, mode: "date" })
			.defaultNow()
			.notNull(),
		sourceLocale: text("source_locale").default("unknown").notNull(),
		updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
		status: pageStatus().default("DRAFT").notNull(),
		userId: text("user_id").notNull(),
		// mdast_json は mdast の Root 型として扱う
		mdastJson: jsonb("mdast_json").$type<MdastRoot>().notNull(),
		order: integer().default(0).notNull(),
		parentId: integer("parent_id"),
	},
	(table) => [
		index("pages_created_at_idx").using(
			"btree",
			table.createdAt.asc().nullsLast(),
		),
		index("pages_parent_id_idx").using(
			"btree",
			table.parentId.asc().nullsLast(),
		),
		index("pages_parent_id_order_idx").using(
			"btree",
			table.parentId.asc().nullsLast(),
			table.order.asc().nullsLast(),
		),
		index("pages_slug_idx").using("btree", table.slug.asc().nullsLast()),
		uniqueIndex("pages_slug_key").using("btree", table.slug.asc().nullsLast()),
		index("pages_user_id_idx").using("btree", table.userId.asc().nullsLast()),
		foreignKey({
			columns: [table.id],
			foreignColumns: [contents.id],
			name: "pages_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "pages_parent_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("set null"),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "pages_user_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const segments = pgTable(
	"segments",
	{
		id: serial().primaryKey().notNull(),
		contentId: integer("content_id").notNull(),
		number: integer().notNull(),
		text: text().notNull(),
		textAndOccurrenceHash: text("text_and_occurrence_hash").notNull(),
		createdAt: timestamp("created_at", { precision: 3, mode: "date" })
			.defaultNow()
			.notNull(),
		segmentTypeId: integer("segment_type_id").notNull(),
	},
	(table) => [
		index("segments_content_id_idx").using(
			"btree",
			table.contentId.asc().nullsLast(),
		),
		uniqueIndex("segments_content_id_number_key").using(
			"btree",
			table.contentId.asc().nullsLast(),
			table.number.asc().nullsLast(),
		),
		uniqueIndex("segments_content_id_text_and_occurrence_hash_key").using(
			"btree",
			table.contentId.asc().nullsLast(),
			table.textAndOccurrenceHash.asc().nullsLast(),
		),
		index("segments_text_and_occurrence_hash_idx").using(
			"btree",
			table.textAndOccurrenceHash.asc().nullsLast(),
		),
		foreignKey({
			columns: [table.contentId],
			foreignColumns: [contents.id],
			name: "segments_content_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.segmentTypeId],
			foreignColumns: [segmentTypes.id],
			name: "segments_segment_type_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
	],
);

export const segmentMetadata = pgTable(
	"segment_metadata",
	{
		id: serial().primaryKey().notNull(),
		segmentId: integer("segment_id").notNull(),
		metadataTypeId: integer("metadata_type_id").notNull(),
		value: text().notNull(),
		createdAt: timestamp("created_at", { precision: 3, mode: "date" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("segment_metadata_metadata_type_id_idx").using(
			"btree",
			table.metadataTypeId.asc().nullsLast(),
		),
		index("segment_metadata_segment_id_idx").using(
			"btree",
			table.segmentId.asc().nullsLast(),
		),
		uniqueIndex("segment_metadata_segment_id_metadata_type_id_value_key").using(
			"btree",
			table.segmentId.asc().nullsLast(),
			table.metadataTypeId.asc().nullsLast(),
			table.value.asc().nullsLast(),
		),
		foreignKey({
			columns: [table.metadataTypeId],
			foreignColumns: [segmentMetadataTypes.id],
			name: "segment_metadata_metadata_type_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.segmentId],
			foreignColumns: [segments.id],
			name: "segment_metadata_segment_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
	],
);

export const users = pgTable(
	"users",
	{
		image: text().default("https://evame.tech/avatar.png").notNull(),
		plan: text().default("free").notNull(),
		totalPoints: integer("total_points").default(0).notNull(),
		isAI: boolean("is_ai").default(false).notNull(),
		provider: text().default("Credentials").notNull(),
		createdAt: timestamp("created_at", { precision: 3, mode: "date" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
		name: text().default("new_user").notNull(),
		handle: text()
			.$defaultFn(() => createId())
			.notNull(),
		profile: text().default("").notNull(),
		id: text()
			.$defaultFn(() => createId())
			.primaryKey()
			.notNull(),
		email: text().notNull(),
		twitterHandle: text("twitter_handle").default("").notNull(),
		emailVerified: boolean("email_verified"),
	},
	(table) => [
		uniqueIndex("users_email_key").using(
			"btree",
			table.email.asc().nullsLast(),
		),
		uniqueIndex("users_handle_key").using(
			"btree",
			table.handle.asc().nullsLast(),
		),
	],
);

export const userSettings = pgTable(
	"user_settings",
	{
		id: serial().primaryKey().notNull(),
		userId: text("user_id").notNull(),
		targetLocales: text("target_locales").array().default(["RAY"]).notNull(),
		createdAt: timestamp("created_at", { precision: 3, mode: "date" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { precision: 3, mode: "date" })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		uniqueIndex("user_settings_user_id_key").using(
			"btree",
			table.userId.asc().nullsLast(),
		),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_settings_user_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("restrict"),
	],
);

export const tagPages = pgTable(
	"tag_pages",
	{
		tagId: integer("tag_id").notNull(),
		pageId: integer("page_id").notNull(),
	},
	(table) => [
		index("tag_pages_pageId_idx").using(
			"btree",
			table.pageId.asc().nullsLast(),
		),
		index("tag_pages_tagId_idx").using("btree", table.tagId.asc().nullsLast()),
		foreignKey({
			columns: [table.pageId],
			foreignColumns: [pages.id],
			name: "tag_pages_pageId_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.tagId],
			foreignColumns: [tags.id],
			name: "tag_pages_tagId_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		primaryKey({
			columns: [table.tagId, table.pageId],
			name: "tag_pages_pkey",
		}),
	],
);

export const verificationTokens = pgTable(
	"verification_tokens",
	{
		identifier: text().notNull(),
		token: text().notNull(),
		expires: timestamp({ precision: 3, mode: "date" }).notNull(),
	},
	(table) => [
		uniqueIndex("verification_tokens_token_key").using(
			"btree",
			table.token.asc().nullsLast(),
		),
		primaryKey({
			columns: [table.identifier, table.token],
			name: "verification_tokens_pkey",
		}),
	],
);

export const segmentAnnotationLinks = pgTable(
	"segment_annotation_links",
	{
		mainSegmentId: integer("main_segment_id").notNull(),
		annotationSegmentId: integer("annotation_segment_id").notNull(),
		createdAt: timestamp("created_at", { precision: 3, mode: "date" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("segment_annotation_links_annotation_segment_id_idx").using(
			"btree",
			table.annotationSegmentId.asc().nullsLast(),
		),
		index("segment_annotation_links_main_segment_id_idx").using(
			"btree",
			table.mainSegmentId.asc().nullsLast(),
		),
		foreignKey({
			columns: [table.annotationSegmentId],
			foreignColumns: [segments.id],
			name: "segment_annotation_links_annotation_segment_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		foreignKey({
			columns: [table.mainSegmentId],
			foreignColumns: [segments.id],
			name: "segment_annotation_links_main_segment_id_fkey",
		})
			.onUpdate("cascade")
			.onDelete("cascade"),
		primaryKey({
			columns: [table.mainSegmentId, table.annotationSegmentId],
			name: "segment_annotation_links_pkey",
		}),
	],
);

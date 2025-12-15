import { relations } from "drizzle-orm/relations";
import {
	accounts,
	contents,
	follows,
	geminiApiKeys,
	importFiles,
	importRuns,
	likePages,
	notifications,
	pageComments,
	pageLocaleTranslationProofs,
	pages,
	pageViews,
	segmentAnnotationLinks,
	segmentMetadata,
	segmentMetadataTypes,
	segments,
	segmentTranslations,
	segmentTypes,
	sessions,
	tagPages,
	tags,
	translationJobs,
	translationVotes,
	userCredentials,
	userSettings,
	users,
} from "./schema";

export const followsRelations = relations(follows, ({ one }) => ({
	user_followerId: one(users, {
		fields: [follows.followerId],
		references: [users.id],
		relationName: "follows_followerId_users_id",
	}),
	user_followingId: one(users, {
		fields: [follows.followingId],
		references: [users.id],
		relationName: "follows_followingId_users_id",
	}),
}));

export const usersRelations = relations(users, ({ many }) => ({
	follows_followerId: many(follows, {
		relationName: "follows_followerId_users_id",
	}),
	follows_followingId: many(follows, {
		relationName: "follows_followingId_users_id",
	}),
	likePages: many(likePages),
	geminiApiKeys: many(geminiApiKeys),
	notifications_actorId: many(notifications, {
		relationName: "notifications_actorId_users_id",
	}),
	notifications_userId: many(notifications, {
		relationName: "notifications_userId_users_id",
	}),
	accounts: many(accounts),
	translationJobs: many(translationJobs),
	sessions: many(sessions),
	translationVotes: many(translationVotes),
	userCredentials: many(userCredentials),
	segmentTranslations: many(segmentTranslations),
	pageComments: many(pageComments),
	pages: many(pages),
	userSettings: many(userSettings),
}));

export const likePagesRelations = relations(likePages, ({ one }) => ({
	page: one(pages, {
		fields: [likePages.pageId],
		references: [pages.id],
	}),
	user: one(users, {
		fields: [likePages.userId],
		references: [users.id],
	}),
}));

export const pagesRelations = relations(pages, ({ one, many }) => ({
	likePages: many(likePages),
	notifications: many(notifications),
	translationJobs: many(translationJobs),
	pageViews: many(pageViews),
	pageLocaleTranslationProofs: many(pageLocaleTranslationProofs),
	pageComments: many(pageComments),
	content: one(contents, {
		fields: [pages.id],
		references: [contents.id],
	}),
	page: one(pages, {
		fields: [pages.parentId],
		references: [pages.id],
		relationName: "pages_parentId_pages_id",
	}),
	pages: many(pages, {
		relationName: "pages_parentId_pages_id",
	}),
	user: one(users, {
		fields: [pages.userId],
		references: [users.id],
	}),
	tagPages: many(tagPages),
}));

export const importFilesRelations = relations(importFiles, ({ one, many }) => ({
	importRun: one(importRuns, {
		fields: [importFiles.importRunId],
		references: [importRuns.id],
	}),
	contents: many(contents),
}));

export const importRunsRelations = relations(importRuns, ({ many }) => ({
	importFiles: many(importFiles),
}));

export const contentsRelations = relations(contents, ({ one, many }) => ({
	importFile: one(importFiles, {
		fields: [contents.importFileId],
		references: [importFiles.id],
	}),
	pageComment: one(pageComments, {
		fields: [contents.id],
		references: [pageComments.id],
	}),
	page: one(pages, {
		fields: [contents.id],
		references: [pages.id],
	}),
	segments: many(segments),
}));

export const geminiApiKeysRelations = relations(geminiApiKeys, ({ one }) => ({
	user: one(users, {
		fields: [geminiApiKeys.userId],
		references: [users.id],
	}),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
	user_actorId: one(users, {
		fields: [notifications.actorId],
		references: [users.id],
		relationName: "notifications_actorId_users_id",
	}),
	pageComment: one(pageComments, {
		fields: [notifications.pageCommentId],
		references: [pageComments.id],
	}),
	page: one(pages, {
		fields: [notifications.pageId],
		references: [pages.id],
	}),
	segmentTranslation: one(segmentTranslations, {
		fields: [notifications.segmentTranslationId],
		references: [segmentTranslations.id],
	}),
	user_userId: one(users, {
		fields: [notifications.userId],
		references: [users.id],
		relationName: "notifications_userId_users_id",
	}),
}));

export const pageCommentsRelations = relations(
	pageComments,
	({ one, many }) => ({
		notifications: many(notifications),
		content: one(contents, {
			fields: [pageComments.id],
			references: [contents.id],
		}),
		page: one(pages, {
			fields: [pageComments.pageId],
			references: [pages.id],
		}),
		pageComment: one(pageComments, {
			fields: [pageComments.parentId],
			references: [pageComments.id],
			relationName: "pageComments_parentId_pageComments_id",
		}),
		pageComments: many(pageComments, {
			relationName: "pageComments_parentId_pageComments_id",
		}),
		user: one(users, {
			fields: [pageComments.userId],
			references: [users.id],
		}),
	}),
);

export const segmentTranslationsRelations = relations(
	segmentTranslations,
	({ one, many }) => ({
		notifications: many(notifications),
		translationVotes: many(translationVotes),
		segment: one(segments, {
			fields: [segmentTranslations.segmentId],
			references: [segments.id],
		}),
		user: one(users, {
			fields: [segmentTranslations.userId],
			references: [users.id],
		}),
	}),
);

export const accountsRelations = relations(accounts, ({ one }) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id],
	}),
}));

export const translationJobsRelations = relations(
	translationJobs,
	({ one }) => ({
		page: one(pages, {
			fields: [translationJobs.pageId],
			references: [pages.id],
		}),
		user: one(users, {
			fields: [translationJobs.userId],
			references: [users.id],
		}),
	}),
);

export const pageViewsRelations = relations(pageViews, ({ one }) => ({
	page: one(pages, {
		fields: [pageViews.pageId],
		references: [pages.id],
	}),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id],
	}),
}));

export const pageLocaleTranslationProofsRelations = relations(
	pageLocaleTranslationProofs,
	({ one }) => ({
		page: one(pages, {
			fields: [pageLocaleTranslationProofs.pageId],
			references: [pages.id],
		}),
	}),
);

export const translationVotesRelations = relations(
	translationVotes,
	({ one }) => ({
		segmentTranslation: one(segmentTranslations, {
			fields: [translationVotes.translationId],
			references: [segmentTranslations.id],
		}),
		user: one(users, {
			fields: [translationVotes.userId],
			references: [users.id],
		}),
	}),
);

export const userCredentialsRelations = relations(
	userCredentials,
	({ one }) => ({
		user: one(users, {
			fields: [userCredentials.userId],
			references: [users.id],
		}),
	}),
);

export const segmentsRelations = relations(segments, ({ one, many }) => ({
	segmentTranslations: many(segmentTranslations),
	content: one(contents, {
		fields: [segments.contentId],
		references: [contents.id],
	}),
	segmentType: one(segmentTypes, {
		fields: [segments.segmentTypeId],
		references: [segmentTypes.id],
	}),
	segmentMetadata: many(segmentMetadata),
	segmentAnnotationLinks_annotationSegmentId: many(segmentAnnotationLinks, {
		relationName: "segmentAnnotationLinks_annotationSegmentId_segments_id",
	}),
	segmentAnnotationLinks_mainSegmentId: many(segmentAnnotationLinks, {
		relationName: "segmentAnnotationLinks_mainSegmentId_segments_id",
	}),
}));

export const segmentTypesRelations = relations(segmentTypes, ({ many }) => ({
	segments: many(segments),
}));

export const segmentMetadataRelations = relations(
	segmentMetadata,
	({ one }) => ({
		segmentMetadataType: one(segmentMetadataTypes, {
			fields: [segmentMetadata.metadataTypeId],
			references: [segmentMetadataTypes.id],
		}),
		segment: one(segments, {
			fields: [segmentMetadata.segmentId],
			references: [segments.id],
		}),
	}),
);

export const segmentMetadataTypesRelations = relations(
	segmentMetadataTypes,
	({ many }) => ({
		segmentMetadata: many(segmentMetadata),
	}),
);

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
	user: one(users, {
		fields: [userSettings.userId],
		references: [users.id],
	}),
}));

export const tagPagesRelations = relations(tagPages, ({ one }) => ({
	page: one(pages, {
		fields: [tagPages.pageId],
		references: [pages.id],
	}),
	tag: one(tags, {
		fields: [tagPages.tagId],
		references: [tags.id],
	}),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
	tagPages: many(tagPages),
}));

export const segmentAnnotationLinksRelations = relations(
	segmentAnnotationLinks,
	({ one }) => ({
		segment_annotationSegmentId: one(segments, {
			fields: [segmentAnnotationLinks.annotationSegmentId],
			references: [segments.id],
			relationName: "segmentAnnotationLinks_annotationSegmentId_segments_id",
		}),
		segment_mainSegmentId: one(segments, {
			fields: [segmentAnnotationLinks.mainSegmentId],
			references: [segments.id],
			relationName: "segmentAnnotationLinks_mainSegmentId_segments_id",
		}),
	}),
);

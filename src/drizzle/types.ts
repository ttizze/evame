/**
 * Drizzle ORM型定義ヘルパー
 *
 * PrismaからDrizzleへの移行時に、型定義を統一するためのヘルパー
 * InferSelectModel: SELECT結果の型
 * InferInsertModel: INSERT用の型
 */
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { db } from "./index";
import type * as schema from "./schema";

// トランザクションクライアント型（dbから推論）
export type TransactionClient = Parameters<
	Parameters<typeof db.transaction>[0]
>[0];

// テーブル型のエクスポート
export type User = InferSelectModel<typeof schema.users>;
export type UserInsert = InferInsertModel<typeof schema.users>;

export type Page = InferSelectModel<typeof schema.pages>;
export type PageInsert = InferInsertModel<typeof schema.pages>;

export type Content = InferSelectModel<typeof schema.contents>;
export type ContentInsert = InferInsertModel<typeof schema.contents>;

export type Segment = InferSelectModel<typeof schema.segments>;
export type SegmentInsert = InferInsertModel<typeof schema.segments>;

export type SegmentTranslation = InferSelectModel<
	typeof schema.segmentTranslations
>;
export type SegmentTranslationInsert = InferInsertModel<
	typeof schema.segmentTranslations
>;

export type PageComment = InferSelectModel<typeof schema.pageComments>;
export type PageCommentInsert = InferInsertModel<typeof schema.pageComments>;

export type Tag = InferSelectModel<typeof schema.tags>;
export type TagInsert = InferInsertModel<typeof schema.tags>;

export type TagPage = InferSelectModel<typeof schema.tagPages>;
export type TagPageInsert = InferInsertModel<typeof schema.tagPages>;

export type LikePage = InferSelectModel<typeof schema.likePages>;
export type LikePageInsert = InferInsertModel<typeof schema.likePages>;

export type Notification = InferSelectModel<typeof schema.notifications>;
export type NotificationInsert = InferInsertModel<typeof schema.notifications>;

export type TranslationVote = InferSelectModel<typeof schema.translationVotes>;
export type TranslationVoteInsert = InferInsertModel<
	typeof schema.translationVotes
>;

export type TranslationJob = InferSelectModel<typeof schema.translationJobs>;
export type TranslationJobInsert = InferInsertModel<
	typeof schema.translationJobs
>;

export type PageView = InferSelectModel<typeof schema.pageViews>;
export type PageViewInsert = InferInsertModel<typeof schema.pageViews>;

export type PageLocaleTranslationProof = InferSelectModel<
	typeof schema.pageLocaleTranslationProofs
>;
export type PageLocaleTranslationProofInsert = InferInsertModel<
	typeof schema.pageLocaleTranslationProofs
>;

export type Follow = InferSelectModel<typeof schema.follows>;
export type FollowInsert = InferInsertModel<typeof schema.follows>;

export type Account = InferSelectModel<typeof schema.accounts>;
export type AccountInsert = InferInsertModel<typeof schema.accounts>;

export type Session = InferSelectModel<typeof schema.sessions>;
export type SessionInsert = InferInsertModel<typeof schema.sessions>;

export type UserSetting = InferSelectModel<typeof schema.userSettings>;
export type UserSettingInsert = InferInsertModel<typeof schema.userSettings>;

export type GeminiApiKey = InferSelectModel<typeof schema.geminiApiKeys>;
export type GeminiApiKeyInsert = InferInsertModel<typeof schema.geminiApiKeys>;

export type SegmentType = InferSelectModel<typeof schema.segmentTypes>;
export type SegmentTypeInsert = InferInsertModel<typeof schema.segmentTypes>;

export type SegmentMetadata = InferSelectModel<typeof schema.segmentMetadata>;
export type SegmentMetadataInsert = InferInsertModel<
	typeof schema.segmentMetadata
>;

export type SegmentMetadataType = InferSelectModel<
	typeof schema.segmentMetadataTypes
>;
export type SegmentMetadataTypeInsert = InferInsertModel<
	typeof schema.segmentMetadataTypes
>;

export type SegmentAnnotationLink = InferSelectModel<
	typeof schema.segmentAnnotationLinks
>;
export type SegmentAnnotationLinkInsert = InferInsertModel<
	typeof schema.segmentAnnotationLinks
>;

export type ImportRun = InferSelectModel<typeof schema.importRuns>;
export type ImportRunInsert = InferInsertModel<typeof schema.importRuns>;

export type ImportFile = InferSelectModel<typeof schema.importFiles>;
export type ImportFileInsert = InferInsertModel<typeof schema.importFiles>;

export type Verification = InferSelectModel<typeof schema.verifications>;
export type VerificationInsert = InferInsertModel<typeof schema.verifications>;

// Enum型のエクスポート
export type ContentKind = (typeof schema.contentKind.enumValues)[number];
export type NotificationType =
	(typeof schema.notificationType.enumValues)[number];
export type PageStatus = (typeof schema.pageStatus.enumValues)[number];
export type SegmentTypeKey = (typeof schema.segmentTypeKey.enumValues)[number];
export type TranslationProofStatus =
	(typeof schema.translationProofStatus.enumValues)[number];
export type TranslationStatus =
	(typeof schema.translationStatus.enumValues)[number];

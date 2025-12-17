/**
 * Kysely型ヘルパー
 * kysely-codegenの出力をSelectable/Insertable/Updateableに変換するユーティリティ
 */
import type { Insertable, Selectable, Updateable } from "kysely";
import type { DB } from "./types";

// ============================================
// テーブル別型定義（公式スタイル）
// ============================================

// User
export type User = Selectable<DB["users"]>;
export type NewUser = Insertable<DB["users"]>;
export type UserUpdate = Updateable<DB["users"]>;

// Page
export type Page = Selectable<DB["pages"]>;
export type NewPage = Insertable<DB["pages"]>;
export type PageUpdate = Updateable<DB["pages"]>;

// Content
export type Content = Selectable<DB["contents"]>;
export type NewContent = Insertable<DB["contents"]>;
export type ContentUpdate = Updateable<DB["contents"]>;

// Segment
export type Segment = Selectable<DB["segments"]>;
export type NewSegment = Insertable<DB["segments"]>;
export type SegmentUpdate = Updateable<DB["segments"]>;

// SegmentTranslation
export type SegmentTranslation = Selectable<DB["segmentTranslations"]>;
export type NewSegmentTranslation = Insertable<DB["segmentTranslations"]>;
export type SegmentTranslationUpdate = Updateable<DB["segmentTranslations"]>;

// TranslationVote
export type TranslationVote = Selectable<DB["translationVotes"]>;
export type NewTranslationVote = Insertable<DB["translationVotes"]>;
export type TranslationVoteUpdate = Updateable<DB["translationVotes"]>;

// TranslationJob
export type TranslationJob = Selectable<DB["translationJobs"]>;
export type NewTranslationJob = Insertable<DB["translationJobs"]>;
export type TranslationJobUpdate = Updateable<DB["translationJobs"]>;

// Tag
export type Tag = Selectable<DB["tags"]>;
export type NewTag = Insertable<DB["tags"]>;
export type TagUpdate = Updateable<DB["tags"]>;

// TagPage
export type TagPage = Selectable<DB["tagPages"]>;
export type NewTagPage = Insertable<DB["tagPages"]>;
export type TagPageUpdate = Updateable<DB["tagPages"]>;

// PageComment
export type PageComment = Selectable<DB["pageComments"]>;
export type NewPageComment = Insertable<DB["pageComments"]>;
export type PageCommentUpdate = Updateable<DB["pageComments"]>;

// Notification
export type Notification = Selectable<DB["notifications"]>;
export type NewNotification = Insertable<DB["notifications"]>;
export type NotificationUpdate = Updateable<DB["notifications"]>;

// Follow
export type Follow = Selectable<DB["follows"]>;
export type NewFollow = Insertable<DB["follows"]>;
export type FollowUpdate = Updateable<DB["follows"]>;

// Session
export type Session = Selectable<DB["sessions"]>;
export type NewSession = Insertable<DB["sessions"]>;
export type SessionUpdate = Updateable<DB["sessions"]>;

// Account
export type Account = Selectable<DB["accounts"]>;
export type NewAccount = Insertable<DB["accounts"]>;
export type AccountUpdate = Updateable<DB["accounts"]>;

// LikePage
export type LikePage = Selectable<DB["likePages"]>;
export type NewLikePage = Insertable<DB["likePages"]>;
export type LikePageUpdate = Updateable<DB["likePages"]>;

// SegmentMetadata
export type SegmentMetadata = Selectable<DB["segmentMetadata"]>;
export type NewSegmentMetadata = Insertable<DB["segmentMetadata"]>;
export type SegmentMetadataUpdate = Updateable<DB["segmentMetadata"]>;

// SegmentAnnotationLink
export type SegmentAnnotationLink = Selectable<DB["segmentAnnotationLinks"]>;
export type NewSegmentAnnotationLink = Insertable<DB["segmentAnnotationLinks"]>;
export type SegmentAnnotationLinkUpdate = Updateable<
	DB["segmentAnnotationLinks"]
>;

// ============================================
// 派生型（ビジネスロジック用）
// ============================================

/** 公開可能なユーザー情報（センシティブ情報を除外） */
export type SanitizedUser = Omit<
	User,
	"email" | "provider" | "emailVerified" | "id"
>;

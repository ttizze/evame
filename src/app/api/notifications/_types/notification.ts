export type NotificationRowsWithRelations = {
	id: number;
	actorId: string;
	actorHandle: string;
	actorName: string;
	actorImage: string;
	read: boolean;
	createdAt: Date;
	type:
		| "FOLLOW"
		| "PAGE_LIKE"
		| "PAGE_COMMENT"
		| "PAGE_SEGMENT_TRANSLATION_VOTE"
		| "PAGE_COMMENT_SEGMENT_TRANSLATION_VOTE";
	// ページ関連のフィールド（PAGE_LIKE, PAGE_COMMENT, 翻訳投票で使用）
	pageSlug: string | null;
	pageOwnerHandle: string | null;
	pageTitle: string | null;
	// 翻訳関連のフィールド（翻訳投票で使用）
	segmentTranslationText: string | null;
};

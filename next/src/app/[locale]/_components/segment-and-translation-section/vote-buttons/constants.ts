export const VOTE_TARGET = {
	PAGE_SEGMENT_TRANSLATION: "pageSegmentTranslation",
	COMMENT_SEGMENT_TRANSLATION: "commentSegmentTranslation",
} as const;

export type VoteTarget = (typeof VOTE_TARGET)[keyof typeof VOTE_TARGET];

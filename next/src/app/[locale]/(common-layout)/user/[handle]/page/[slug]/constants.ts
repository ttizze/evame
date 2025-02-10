export const VOTE_TARGET = {
	PAGE_SEGMENT_TRANSLATION: "pageSegmentTranslation",
	COMMENT_SEGMENT_TRANSLATION: "commentSegmentTranslation",
} as const;

export type VoteTarget = (typeof VOTE_TARGET)[keyof typeof VOTE_TARGET];

export const ADD_TRANSLATION_FORM_TARGET = {
	PAGE_SEGMENT_TRANSLATION: "pageSegmentTranslation",
	COMMENT_SEGMENT_TRANSLATION: "commentSegmentTranslation",
} as const;

export type AddTranslationFormTarget =
	(typeof ADD_TRANSLATION_FORM_TARGET)[keyof typeof ADD_TRANSLATION_FORM_TARGET];

export enum TranslateTarget {
	TRANSLATE_PAGE = "translatePage",
	TRANSLATE_COMMENT = "translateComment",
}

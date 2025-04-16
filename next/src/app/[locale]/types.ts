import type { Page, Tag, TagPage } from "@prisma/client";
import type { SanitizedUser } from "../types";

type Segment = {
	id: number;
	number: number;
	text: string;
};
type SegmentTranslation = {
	id: number;
	locale: string;
	text: string;
	userId: string;
	point: number;
	createdAt: Date;
};

type TranslationCurrentUserVote = {
	id: number;
	userId: string;
	translationId: number;
	isUpvote: boolean;
	createdAt: Date;
	updatedAt: Date;
};

export type SegmentTranslationWithVote = {
	segmentTranslation: SegmentTranslation & {
		user: SanitizedUser;
		translationCurrentUserVote: TranslationCurrentUserVote | null;
	};
};

export type SegmentWithTranslations = Segment & {
	segmentTranslationsWithVotes: SegmentTranslationWithVote[];
	bestSegmentTranslationWithVote: SegmentTranslationWithVote | null;
};
export type TagPageWithTag = TagPage & {
	tag: Tag;
};
export type PageWithRelations = Omit<Page, "createdAt"> & {
	createdAt: string;
	user: SanitizedUser;
	tagPages: TagPageWithTag[];
	segmentWithTranslations: SegmentWithTranslations[];
	_count?: {
		pageComments: number;
		likePages: number;
	};
};

import type { Page, Tag, TagPage } from "@prisma/client";
import type { SanitizedUser } from "../types";

type SegmentTranslation = {
	id: number;
	locale: string;
	text: string;
	userId: string;
	point: number;
	createdAt: Date;
};

type TranslationVote = {
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
	};
	translationVote: TranslationVote | null;
};

type Segment = {
	id: number;
	number: number;
	text: string;
};
export type SegmentWithTranslations = {
	segment: Segment;
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

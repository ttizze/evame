import type { SanitizedUser } from "@/app/types";
import type { Page, Tag, TagPage } from "@prisma/client";

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
	textAndOccurrenceHash: string;
	createdAt: Date;
};
export type SegmentWithTranslations = {
	segment: Segment;
	segmentTranslationsWithVotes: SegmentTranslationWithVote[];
	bestSegmentTranslationWithVote: SegmentTranslationWithVote | null;
};
export type TagPageWithTag = TagPage & {
	tag: Tag;
};
export interface PageLocalizedDate extends Omit<Page, "createdAt"> {
	createdAt: string;
}
export type PageWithTranslations = {
	page: PageLocalizedDate;
	user: SanitizedUser;
	tagPages: TagPageWithTag[];
	segmentWithTranslations: SegmentWithTranslations[];
};

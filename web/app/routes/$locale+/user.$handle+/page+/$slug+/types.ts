import type {
	Page,
	PageSegment,
	PageSegmentTranslation,
	Tag,
	TagPage,
	Vote,
} from "@prisma/client";
import type { User } from "@prisma/client";

export type PageSegmentTranslationWithVote = {
	pageSegmentTranslation: PageSegmentTranslation & {
		user: User;
	};
	vote: Vote | null;
};

export type PageSegmentWithTranslations = {
	pageSegment: PageSegment;
	pageSegmentTranslationsWithVotes: PageSegmentTranslationWithVote[];
	bestPageSegmentTranslationWithVote: PageSegmentTranslationWithVote | null;
};
export type TagPageWithTag = TagPage & {
	tag: Tag;
};
export interface PageLocalizedDate extends Omit<Page, "createdAt"> {
	createdAt: string;
}
export type PageWithTranslations = {
	page: PageLocalizedDate;
	user: User;
	tagPages: TagPageWithTag[];
	pageSegmentWithTranslations: PageSegmentWithTranslations[];
	existLocales: string[];
};

import type {
	Page,
	SourceText,
	Tag,
	TagPage,
	TranslateText,
	Vote,
} from "@prisma/client";
import type { User } from "@prisma/client";

export type TranslationWithVote = {
	translateText: TranslateText & {
		user: User;
	};
	vote: Vote | null;
};

export type SourceTextWithTranslations = {
	sourceText: SourceText;
	translationsWithVotes: TranslationWithVote[];
	bestTranslationWithVote: TranslationWithVote | null;
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
	sourceTextWithTranslations: SourceTextWithTranslations[];
	existLocales: string[];
};

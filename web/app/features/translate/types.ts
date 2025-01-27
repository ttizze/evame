import type { TranslationStatus } from "@prisma/client";
import type { TranslationIntent } from "~/routes/$locale+/user.$handle+/page+/$slug+/index";
export type NumberedElement = {
	number: number;
	text: string;
};

export interface TranslateJobParams {
	userId: number;
	pageId: number;
	userAITranslationInfoId: number;
	geminiApiKey: string;
	aiModel: string;
	locale: string;
	title: string;
	numberedElements: NumberedElement[];
	translationIntent: TranslationIntent;
}
interface TranslateDependenciesSegment {
	id: number;
	number: number;
	createdAt: Date;
	text: string;
}

export interface PageTranslationDependencies {
	getLatestPageSegments: (
		pageId: number,
	) => Promise<TranslateDependenciesSegment[]>;

	saveTranslationsForPage: (
		extractedTranslations: NumberedElement[],
		pageSegments: TranslateDependenciesSegment[],
		locale: string,
		aiModel: string,
	) => Promise<void>;
}

export interface CommentTranslationDependencies {
	getLatestPageCommentSegments: (
		pageId: number,
	) => Promise<TranslateDependenciesSegment[]>;
	saveTranslationsForComment: (
		extractedTranslations: NumberedElement[],
		pageCommentSegments: TranslateDependenciesSegment[],
		locale: string,
		aiModel: string,
	) => Promise<void>;
}

export interface CommonTranslationDependencies {
	updateUserAITranslationInfo: (
		userAITranslationInfoId: number,
		status: TranslationStatus,
		progress: number,
	) => Promise<void>;
	getTranslatedText: (
		geminiApiKey: string,
		aiModel: string,
		numberedElements: NumberedElement[],
		locale: string,
		title: string,
	) => Promise<string>;
}

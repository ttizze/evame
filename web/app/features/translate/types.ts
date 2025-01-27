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
	commentId?: number;
}

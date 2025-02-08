import type { TranslationIntent } from "@/app/[locale]/user/[handle]/page/[slug]/constants";
export type NumberedElement = {
	number: number;
	text: string;
};

export interface TranslateJobParams {
	userId: string;
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

import type { TranslateTarget } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
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
	targetLocale: string;
	title: string;
	numberedElements: NumberedElement[];
	translateTarget: TranslateTarget;
	commentId?: number;
}

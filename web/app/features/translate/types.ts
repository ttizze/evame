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
	targetLanguage: string;
	title: string;
	numberedContent: string;
	numberedElements: NumberedElement[];
}

export type NumberedElement = {
	number: number;
	text: string;
};

export type TranslationProvider = "gemini" | "vertex";

export interface TranslateJobParams {
	userId: string;
	pageId: number;
	translationJobId: number;
	provider: TranslationProvider;
	aiModel: string;
	targetLocale: string;
	title: string;
	numberedElements: NumberedElement[];
	pageCommentId?: number;
}

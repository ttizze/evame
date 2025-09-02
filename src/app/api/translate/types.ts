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

export interface TranslateChunkParams
	extends Omit<TranslateJobParams, "numberedElements"> {
	numberedElements: NumberedElement[];
	totalChunks: number;
	chunkIndex: number;
}

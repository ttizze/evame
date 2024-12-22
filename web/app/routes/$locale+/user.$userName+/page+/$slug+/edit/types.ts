export type TextElementInfo = {
	number: number;
	text: string;
	sourceTextId: number | undefined;
};

export interface TranslateJobParams {
	geminiApiKey: string;
	aiModel: string;
	userId: number;
	locale: string;
	pageId: number;
	title: string;
	numberedContent: string;
	numberedElements: TextElementInfo[];
	slug: string;
}

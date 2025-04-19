import type { TargetContentType } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
export type NumberedElement = {
	number: number;
	text: string;
};

export interface TranslateJobParams {
	userId: string;
	pageId?: number;
	projectId?: string;
	translationJobId: number;
	geminiApiKey: string;
	aiModel: string;
	targetLocale: string;
	title: string;
	numberedElements: NumberedElement[];
	targetContentType: TargetContentType;
	commentId?: number;
}

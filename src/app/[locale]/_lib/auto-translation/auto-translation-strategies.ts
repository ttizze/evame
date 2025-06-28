import type { TranslateJobParams } from "@/features/translate/types";
import type { TranslationStrategy } from "./handle-auto-translation";

interface BaseTranslationParams {
	currentUserId: string;
	sourceLocale: string;
}

export interface PageTranslationParams extends BaseTranslationParams {
	type: "page";
	pageId: number;
}

export interface PageCommentTranslationParams extends BaseTranslationParams {
	type: "pageComment";
	pageId: number;
	pageCommentId: number;
}
export const pageStrategy: TranslationStrategy<PageTranslationParams> = {
	async createTranslationJob(deps, { currentUserId, pageId }, locale) {
		return deps.createTranslationJob({
			userId: currentUserId,
			pageId,
			locale,
			aiModel: "gemini-2.0-flash",
		});
	},

	async buildParamsForTranslationAPI(
		deps,
		{ currentUserId, pageId },
		job,
		locale,
	): Promise<TranslateJobParams> {
		const page = await deps.fetchPageWithPageSegments(pageId);
		if (!page) throw new Error("Page not found");

		return {
			translationJobId: job.id,
			provider: "vertex",
			aiModel: job.aiModel,
			userId: currentUserId,
			pageId,
			targetLocale: locale,
			targetContentType: "page",
			title: page.title,
			numberedElements: page.pageSegments.map(({ number, text }) => ({
				number,
				text,
			})),
		};
	},
};

export const pageCommentStrategy: TranslationStrategy<PageCommentTranslationParams> =
	{
		async createTranslationJob(deps, { currentUserId, pageId }, locale) {
			return deps.createTranslationJob({
				userId: currentUserId,
				pageId,
				locale,
				aiModel: "gemini-2.0-flash",
			});
		},

		async buildParamsForTranslationAPI(
			deps,
			{ currentUserId, pageId, pageCommentId },
			job,
			locale,
		): Promise<TranslateJobParams> {
			const page = await deps.fetchPageWithTitleAndComments(pageId);
			if (!page) throw new Error("Page not found");

			const comment = page.pageComments.find((c) => c.id === pageCommentId);
			if (!comment) throw new Error("Comment not found");

			return {
				translationJobId: job.id,
				provider: "vertex",
				aiModel: job.aiModel,
				userId: currentUserId,
				pageId,
				targetLocale: locale,
				targetContentType: "pageComment",
				title: page.title,
				pageCommentId,
				numberedElements: [
					...comment.pageCommentSegments.map(({ number, text }) => ({
						number,
						text,
					})),
					{ number: 0, text: page.title },
				],
			};
		},
	};

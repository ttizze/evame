import type { TranslateJobParams } from "@/features/translate/types";
import type {
	PageCommentTranslationParams,
	PageTranslationParams,
	ProjectCommentTranslationParams,
	ProjectTranslationParams,
	TranslationStrategy,
} from "./handle-auto-translation";
export const pageStrategy: TranslationStrategy<PageTranslationParams> = {
	async createJob(deps, { currentUserId, pageId }, locale) {
		return deps.createTranslationJob({
			userId: currentUserId,
			pageId,
			locale,
			aiModel: "gemini-1.5-flash",
		});
	},

	async buildJobParams(
		deps,
		{ currentUserId, pageId, geminiApiKey },
		job,
		locale,
	): Promise<TranslateJobParams> {
		const page = await deps.fetchPageWithPageSegments(pageId);
		if (!page) throw new Error("Page not found");

		return {
			translationJobId: job.id,
			geminiApiKey,
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

export const projectStrategy: TranslationStrategy<ProjectTranslationParams> = {
	async createJob(deps, { currentUserId, projectId }, locale) {
		return deps.createTranslationJob({
			userId: currentUserId,
			projectId,
			locale,
			aiModel: "gemini-1.5-flash",
		});
	},

	async buildJobParams(
		deps,
		{ currentUserId, projectId, geminiApiKey },
		job,
		locale,
	): Promise<TranslateJobParams> {
		const project = await deps.fetchProjectWithProjectSegments(projectId);
		if (!project) throw new Error("Project not found");

		return {
			translationJobId: job.id,
			geminiApiKey,
			aiModel: job.aiModel,
			userId: currentUserId,
			projectId,
			targetLocale: locale,
			targetContentType: "project",
			title: project.title,
			numberedElements: project.pageSegments.map(({ number, text }) => ({
				number,
				text,
			})),
		};
	},
};

export const pageCommentStrategy: TranslationStrategy<PageCommentTranslationParams> =
	{
		async createJob(deps, { currentUserId, pageId }, locale) {
			return deps.createTranslationJob({
				userId: currentUserId,
				pageId,
				locale,
				aiModel: "gemini-1.5-flash",
			});
		},

		async buildJobParams(
			deps,
			{ currentUserId, pageId, pageCommentId, geminiApiKey },
			job,
			locale,
		): Promise<TranslateJobParams> {
			const page = await deps.fetchPageWithTitleAndComments(pageId);
			if (!page) throw new Error("Page not found");

			const comment = page.pageComments.find((c) => c.id === pageCommentId);
			if (!comment) throw new Error("Comment not found");

			return {
				translationJobId: job.id,
				geminiApiKey,
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

export const projectCommentStrategy: TranslationStrategy<ProjectCommentTranslationParams> =
	{
		async createJob(deps, { currentUserId, projectId }, locale) {
			return deps.createTranslationJob({
				userId: currentUserId,
				projectId,
				locale,
				aiModel: "gemini-1.5-flash",
			});
		},

		async buildJobParams(
			deps,
			{ currentUserId, projectId, projectCommentId, geminiApiKey },
			job,
			locale,
		): Promise<TranslateJobParams> {
			const project = await deps.fetchProjectWithTitleAndComments(projectId);
			if (!project) throw new Error("Project not found");

			const comment = project.projectComments?.find(
				(c) => c.id === projectCommentId,
			);
			if (!comment) throw new Error("Project comment not found");

			return {
				translationJobId: job.id,
				geminiApiKey,
				aiModel: job.aiModel,
				userId: currentUserId,
				projectId,
				targetLocale: locale,
				targetContentType: "projectComment",
				title: project.title,
				projectCommentId,
				numberedElements: [
					...comment.projectCommentSegments.map(({ number, text }) => ({
						number,
						text,
					})),
					{ number: 0, text: project.title },
				],
			};
		},
	};

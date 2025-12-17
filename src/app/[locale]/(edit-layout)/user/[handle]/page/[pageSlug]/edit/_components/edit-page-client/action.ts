"use server";

import { z } from "zod";
import { createActionFactory } from "@/app/[locale]/_action/create-action-factory";
import { getLocaleFromHtml } from "@/app/[locale]/_domain/get-locale-from-html";
import type { ActionResponse } from "@/app/types";
import { db } from "@/db";
import { createServerLogger } from "@/lib/logger.server";
import { processPageHtml } from "./service/process-page-html";

/* ────────────── 入力スキーマ ────────────── */
const formSchema = z.object({
	pageSlug: z.string(),
	userLocale: z.string(),
	title: z.string().min(1).max(100),
	pageContent: z.string().min(1),
});

/* ────────────── 型 ────────────── */
type SuccessData = undefined;
export type EditPageContentActionState = ActionResponse<
	SuccessData,
	z.infer<typeof formSchema>
>;

/* ────────────── アクション ────────────── */
export const editPageContentAction = createActionFactory<
	typeof formSchema,
	SuccessData,
	SuccessData
>({
	inputSchema: formSchema,

	async create(input, userId) {
		const { pageSlug, userLocale, title, pageContent } = input;

		const logger = createServerLogger("edit-page-content", {
			userId,
			pageSlug,
			userLocale,
		});

		logger.debug(
			{ titleLength: title.length, contentLength: pageContent.length },
			"Page save request received",
		);

		try {
			const sourceLocale = await getLocaleFromHtml(pageContent, userLocale);
			logger.debug({ sourceLocale }, "Source locale detected");

			// 既存ページの情報を取得
			const existingPage = await db
				.selectFrom("pages")
				.select(["parentId", "order", "status"])
				.where("slug", "=", pageSlug)
				.where("userId", "=", userId)
				.executeTakeFirst();

			await processPageHtml({
				title,
				html: pageContent,
				pageSlug,
				userId,
				sourceLocale,
				segmentTypeId: null,
				parentId: existingPage?.parentId ?? null,
				order: existingPage?.order ?? 0,
				anchorContentId: null,
				status: existingPage?.status ?? "DRAFT",
			});

			logger.debug({}, "Page saved successfully");

			return {
				success: true,
				data: undefined,
			};
		} catch (error) {
			logger.error({ err: error }, "Failed to save page");
			throw error;
		}
	},

	buildRevalidatePaths: (i, handle) => [
		`/${i.userLocale}/user/${handle}/page/${i.pageSlug}`,
	],

	buildResponse: (_d) => ({ success: true, data: undefined }),
});

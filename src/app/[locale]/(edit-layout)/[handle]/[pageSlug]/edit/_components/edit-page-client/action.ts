"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { createServerLogger } from "@/app/_service/logger.server";
import { createActionFactory } from "@/app/[locale]/_action/create-action-factory";
import { getLocaleFromHtml } from "@/app/[locale]/_domain/get-locale-from-html";
import type { ActionResponse } from "@/app/types";
import { db } from "@/db";
import { processPageHtml } from "./service/process-page-html";

/* ────────────── 入力スキーマ ────────────── */
const formSchema = z.object({
	pageSlug: z.string(),
	userLocale: z.string(),
	// タイトルに改行が混ざると revision や表示の前提が崩れるため、保存時に正規化する。
	// Enter はクライアント側で抑止しているが、ペースト等で混入し得るため server でも保証する。
	title: z
		.string()
		.transform((s) => s.replace(/\r\n|\r|\n/g, " ").trim())
		.pipe(z.string().min(1).max(100)),
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

			const updatedPage = await processPageHtml({
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

			updateTag(`page:${updatedPage.id}`);

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

	buildResponse: (_d) => ({ success: true, data: undefined }),
});

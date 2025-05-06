"use server";

import { createActionFactory } from "@/app/[locale]/_action/create-action-factory";
import { getLocaleFromHtml } from "@/app/[locale]/_lib/get-locale-from-html";

import {
	iconSchema,
	imageSchema,
	linkSchema,
	upsertIconTx,
	upsertImagesTx,
	upsertLinksTx,
	upsertProjectTags,
} from "../_db/mutations.server";

import type { TranslationJobForToast } from "@/app/[locale]/_hooks/use-translation-jobs";
import { handleProjectAutoTranslation } from "@/app/[locale]/_lib/handle-auto-translation";
import type { ActionResponse } from "@/app/types";
import { z } from "zod";
import { processProjectHtml } from "./_lib/process-project-html";

/* ────────────── 入力定義 ────────────── */
function tagSchema() {
	return z
		.string()
		.regex(/^[^\s!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]+$/)
		.min(1)
		.max(15);
}
const parseJSONSafe = (v: unknown) => {
	if (typeof v !== "string" || v.trim() === "") return undefined;
	try {
		return JSON.parse(v);
	} catch {
		return undefined;
	}
};

const formSchema = z.object({
	projectId: z.coerce.number().min(1),
	slug: z.string(),
	userLocale: z.string(),
	title: z.string().min(3).max(100),
	tagLine: z.string().min(3).max(100),
	description: z.string().min(10).max(500),
	status: z.string(),
	progress: z.string(),
	tags: z.preprocess(parseJSONSafe, z.array(tagSchema()).max(5)),
	links: z.preprocess(parseJSONSafe, z.array(linkSchema).max(5)),
	images: z.preprocess(parseJSONSafe, z.array(imageSchema).max(10)),
	icon: z.preprocess(parseJSONSafe, iconSchema.nullable()),
});

/* ────────────── 型 ────────────── */
type SuccessData = { translationJobs: TranslationJobForToast[] };
export type ProjectActionResponse = ActionResponse<
	SuccessData,
	z.infer<typeof formSchema>
>;

/* ────────────── アクション本体 ────────────── */
export const projectAction = createActionFactory<
	typeof formSchema,
	SuccessData,
	SuccessData
>({
	inputSchema: formSchema,

	/* 1. 認証 + バリデーション後に呼ばれるドメインロジック */
	async create(input, currentUserId) {
		const {
			projectId,
			slug,
			tagLine,
			userLocale,
			title,
			description,
			status,
			progress,
			tags,
			links,
			images,
			icon,
		} = input;

		/* 言語判定 */
		const combined = `${tagLine} ${description}`;
		const sourceLocale = await getLocaleFromHtml(combined, userLocale);

		/* 本体 HTML の保存 / 更新 */
		const updatedProject = await processProjectHtml({
			slug,
			title,
			description,
			tagLine,
			projectId,
			userId: currentUserId,
			sourceLocale,
			status,
			progress,
		});

		/* 付帯テーブル更新 */
		await upsertProjectTags(tags, updatedProject.id);
		await upsertLinksTx(updatedProject.id, links);
		await upsertImagesTx(updatedProject.id, images, icon?.id);
		await upsertIconTx(updatedProject.id, icon);

		const translationJobs = await handleProjectAutoTranslation({
			currentUserId,
			projectId,
			sourceLocale,
			geminiApiKey: process.env.GEMINI_API_KEY ?? "",
		});

		return {
			success: true,
			data: {
				translationJobs,
			},
		};
	},

	/* 2. 成功時のみキャッシュ再検証 */
	buildRevalidatePaths: (i, handle) => [`/user/${handle}/project/${i.slug}`],

	/* 3. クライアントへ返す最終形 */
	buildResponse: (d) => ({
		success: true,
		data: d,
	}),
});

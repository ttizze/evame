"use server";

import { createActionFactory } from "@/app/[locale]/_action/create-action-factory";
import { getLocaleFromHtml } from "@/app/[locale]/_lib/get-locale-from-html";
import { uploadImage } from "@/app/[locale]/_lib/upload";

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
import type { ActionResponse } from "@/app/types";
import { z } from "zod";
import { processProjectHtml } from "./_lib/process-project-html";
import { handleProjectAutoTranslation } from "@/app/[locale]/_lib/handle-auto-translation";

/* ────────────── 入力定義 ────────────── */
function tagSchema() {
	return z
		.string()
		.regex(/^[^\s!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]+$/)
		.min(1)
		.max(15);
}

const parseJSONSafe = (value: unknown) => {
	if (!value || (typeof value === "string" && value.trim() === ""))
		return undefined;
	try {
		return JSON.parse(value as string);
	} catch {
		return [];
	}
};

const toArray = <T>(v: unknown): T[] => {
  if (v == null) return [];                // undefined / null → []
  if (Array.isArray(v)) return v as T[];   // すでに配列ならそのまま
  return [v as T];                         // 単数を配列に包む
};

const formSchema = z.object({
	projectId: z.coerce.number().min(1),
	slug: z.string(),
	userLocale: z.string(),
	title: z.string().min(3).max(100),
	tagLine: z.string().min(3).max(100),
	description: z.string().min(10).max(500),
	tags: z.preprocess(parseJSONSafe, z.array(tagSchema()).max(5)),
	links: z.preprocess(parseJSONSafe, z.array(linkSchema).max(5)),
	images: z.preprocess(parseJSONSafe, z.array(imageSchema).max(10)),
	icon: z.preprocess(parseJSONSafe, iconSchema),

	/* ファイルは FormData そのまま受け取る */
  imageFiles: z.preprocess(
    (v) => toArray<File>(v),
    z.array(z.instanceof(File)).max(10),
  ),

  imageFileNames: z.preprocess(
    (v) => toArray<string>(v),
    z.array(z.string()).max(10),
  ),

  // こちらは単数で良いのでそのまま
  iconFile: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.instanceof(File).optional(),
  ),
  iconFileName: z.string().optional(),
});

/* ────────────── 付帯ヘルパ ────────────── */
async function uploadFiles(files: File[], names: string[]) {
	const map: Record<string, string> = {};
	for (let i = 0; i < files.length; i += 1) {
		const r = await uploadImage(files[i]);
		if (!r.success) throw new Error(r.message || "Upload failed");
		map[names[i]] = r.data.imageUrl;
	}
	return map;
}

function replaceTempUrls<T extends { url: string }>(
	items: T[],
	m: Record<string, string>,
): T[] {
	return items.map((it) => {
		if (!it.url.startsWith("temp://upload/")) return it;
		const file = it.url.split("/").pop() ?? "";
		return { ...it, url: m[file] ?? it.url };
	});
}

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
			tags,
			links,
			images,
			icon,
			imageFiles,
			imageFileNames,
			iconFile,
			iconFileName,
		} = input;

		/* 言語判定 */
		const combined = `${tagLine} ${description}`;
		const sourceLocale = await getLocaleFromHtml(combined, userLocale);

		/* 画像アップロード */
		const map = imageFiles.length
			? await uploadFiles(imageFiles, imageFileNames)
			: {};
		const processedImages = replaceTempUrls(images, map);

		/* 本体 HTML の保存 / 更新 */
		const updatedProject = await processProjectHtml({
			slug,
			title,
			description,
			tagLine,
			projectId,
			userId: currentUserId,
			sourceLocale,
		});

		/* 付帯テーブル更新 */
		await upsertProjectTags(tags, updatedProject.id);
		await upsertLinksTx(updatedProject.id, links);
		await upsertImagesTx(updatedProject.id, processedImages, icon?.id);
		await upsertIconTx(updatedProject.id, icon, iconFile, iconFileName);

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

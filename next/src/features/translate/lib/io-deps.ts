import { prisma } from "@/lib/prisma";
import type {
	Prisma, // ← @prisma/client から import
} from "@prisma/client";
import { getOrCreateAIUser } from "../db/mutations.server";
import { getGeminiModelResponse } from "../services/gemini";
import type { NumberedElement } from "../types";

type Segment = { id: number; number: number };

interface TranslationBase {
	locale: string;
	text: string;
	userId: string;
}

/**
 * extracted と segments を突き合わせて
 *   [{ locale, text, userId, [idField]: id }, …]
 * を返すだけの小関数。
 */
function buildData<
	Field extends string,
	Out extends TranslationBase & Record<Field, number>,
>(
	extracted: readonly NumberedElement[],
	segments: readonly Segment[],
	locale: string,
	userId: string,
	idField: Field,
): Out[] {
	const map = new Map(segments.map((s) => [s.number, s.id]));

	return extracted.flatMap((el) => {
		const id = map.get(el.number);
		if (!id) {
			console.error(`segment #${el.number} not found (${el.text})`);
			return [];
		}
		return [
			{
				locale,
				text: el.text,
				userId,
				[idField]: id,
			} as unknown as Out,
		];
	});
}
export async function saveTranslationsForPage(
	extracted: NumberedElement[],
	pageSegments: Segment[],
	locale: string,
	aiModel: string,
) {
	const userId = await getOrCreateAIUser(aiModel);
	const data = buildData<
		"pageSegmentId",
		Prisma.PageSegmentTranslationCreateManyInput
	>(extracted, pageSegments, locale, userId, "pageSegmentId");

	if (data.length) await prisma.pageSegmentTranslation.createMany({ data });
}

export async function saveTranslationsForProject(
	extracted: NumberedElement[],
	projectSegments: Segment[],
	locale: string,
	aiModel: string,
) {
	const userId = await getOrCreateAIUser(aiModel);
	const data = buildData<
		"projectSegmentId",
		Prisma.ProjectSegmentTranslationCreateManyInput
	>(extracted, projectSegments, locale, userId, "projectSegmentId");

	if (data.length) await prisma.projectSegmentTranslation.createMany({ data });
}

export async function saveTranslationsForComment(
	extracted: NumberedElement[],
	pageCommentSegments: Segment[],
	locale: string,
	aiModel: string,
) {
	const userId = await getOrCreateAIUser(aiModel);
	const data = buildData<
		"pageCommentSegmentId",
		Prisma.PageCommentSegmentTranslationCreateManyInput
	>(extracted, pageCommentSegments, locale, userId, "pageCommentSegmentId");
	console.log(data);
	if (data.length)
		await prisma.pageCommentSegmentTranslation.createMany({ data });
}
export async function getTranslatedText(
	geminiApiKey: string,
	aiModel: string,
	numberedElements: NumberedElement[],
	targetLocale: string,
	title: string,
) {
	const source_text = numberedElements
		.map((el) => JSON.stringify(el))
		.join("\n");
	return getGeminiModelResponse(
		geminiApiKey,
		aiModel,
		title,
		source_text,
		targetLocale,
	);
}

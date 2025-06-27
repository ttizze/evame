import type {
	Prisma, // ← @prisma/client から import
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrCreateAIUser } from "../db/mutations.server";
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

export async function saveTranslationsForPageComment(
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

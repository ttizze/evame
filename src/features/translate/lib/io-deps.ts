import type { Prisma } from "@prisma/client";
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
function buildData<Out extends TranslationBase & { segmentId: number }>(
	extracted: readonly NumberedElement[],
	segments: readonly Segment[],
	locale: string,
	userId: string,
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
				segmentId: id,
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
	const data = buildData<Prisma.SegmentTranslationCreateManyInput>(
		extracted,
		pageSegments,
		locale,
		userId,
	);

	if (data.length) await prisma.segmentTranslation.createMany({ data });
}

export async function saveTranslationsForPageComment(
	extracted: NumberedElement[],
	pageCommentSegments: Segment[],
	locale: string,
	aiModel: string,
) {
	const userId = await getOrCreateAIUser(aiModel);
	const data = buildData<Prisma.SegmentTranslationCreateManyInput>(
		extracted,
		pageCommentSegments,
		locale,
		userId,
	);
	if (data.length) await prisma.segmentTranslation.createMany({ data });
}

import { bestTranslationLiteSubquery } from "@/app/[locale]/_db/best-translation-subquery.server";
import { getPageById } from "@/app/[locale]/_db/queries.server";
import type { TitleSegment } from "@/app/[locale]/types";
import type { SanitizedUser } from "@/app/types";
import { db } from "@/db";

type ParentNode = {
	id: number;
	slug: string;
	order: number;
	sourceLocale: string;
	status: string;
	parentId: number | null;
	createdAt: string;
	user: SanitizedUser;
	content: { titleSegment: TitleSegment };
	children: ParentNode[];
};

// 親ページの階層を取得する関数
export async function getParentChain(pageId: number, locale: string) {
	const parentChain: ParentNode[] = [];
	let currentParentId = await getParentId(pageId);

	while (currentParentId) {
		// ページ基本情報を取得
		const parent = await getPageById(currentParentId);
		if (!parent) {
			break;
		}

		// セグメント（number: 0のみ）を取得
		const titleSegment = await fetchTitleSegment(
			parent.id,
			locale,
			parent.user.id,
		);

		parentChain.unshift({
			id: parent.id,
			slug: parent.slug,
			order: parent.order,
			sourceLocale: parent.sourceLocale,
			status: parent.status,
			parentId: parent.parentId,
			createdAt: parent.createdAt.toISOString(),
			user: parent.user,
			content: { titleSegment },
			children: [],
		});

		currentParentId = parent.parentId;
	}

	return parentChain;
}

// ページの親IDを取得する関数
async function getParentId(pageId: number): Promise<number | null> {
	const result = await db
		.selectFrom("pages")
		.select("parentId")
		.where("id", "=", pageId)
		.executeTakeFirst();
	return result?.parentId ?? null;
}

// タイトルセグメント（number: 0）を取得
async function fetchTitleSegment(
	pageId: number,
	locale: string,
	pageOwnerId: string,
): Promise<TitleSegment> {
	const row = await db
		.selectFrom("segments")
		.innerJoin("segmentTypes", "segments.segmentTypeId", "segmentTypes.id")
		.leftJoin(
			(eb) =>
				bestTranslationLiteSubquery(eb, {
					locale,
					ownerUserId: pageOwnerId,
				}).as("trans"),
			(join) => join.onRef("trans.segmentId", "=", "segments.id"),
		)
		.select([
			"segments.id as id",
			"segments.contentId as contentId",
			"segments.number as number",
			"segments.text as text",
			"segments.textAndOccurrenceHash as textAndOccurrenceHash",
			"segments.createdAt as createdAt",
			"segments.segmentTypeId as segmentTypeId",
			"segmentTypes.key as segmentTypeKey",
			"segmentTypes.label as segmentTypeLabel",
			"trans.id as translationId",
			"trans.text as translationText",
		])
		.where("segments.contentId", "=", pageId)
		.where("segments.number", "=", 0)
		.executeTakeFirst();

	if (!row) throw new Error("Title segment not found");

	return row;
}

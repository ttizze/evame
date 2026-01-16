import { bestTranslationByPagesSubquery } from "@/app/[locale]/_db/best-translation-subquery.server";
import { db } from "@/db";
import type { PageForTree, TitleSegment } from "../types";

type PageTreeRow = {
	id: number;
	slug: string;
	parentId: number | null;
	order: number;
	userHandle: string;
	segmentId: number;
	segmentText: string;
	segmentHash: string;
	segmentCreatedAt: Date;
	segmentTypeId: number;
	segmentTypeKey: string;
	segmentTypeLabel: string;
	translationId: number | null;
	translationText: string | null;
	childrenCount: number | string | bigint | null;
};

function toTitleSegment(row: PageTreeRow): TitleSegment {
	return {
		id: row.segmentId,
		contentId: row.id,
		number: 0,
		text: row.segmentText,
		textAndOccurrenceHash: row.segmentHash,
		createdAt: row.segmentCreatedAt,
		segmentTypeId: row.segmentTypeId,
		segmentTypeKey: row.segmentTypeKey,
		segmentTypeLabel: row.segmentTypeLabel,
		translationId: row.translationId ?? null,
		translationText: row.translationText ?? null,
	};
}

function buildPageTreeQuery(locale: string) {
	return db
		.selectFrom("pages")
		.innerJoin("users", "pages.userId", "users.id")
		.innerJoin(
			(eb) =>
				eb
					.selectFrom("segments")
					.innerJoin(
						"segmentTypes",
						"segments.segmentTypeId",
						"segmentTypes.id",
					)
					.select([
						"segments.id",
						"segments.contentId",
						"segments.text",
						"segments.textAndOccurrenceHash",
						"segments.createdAt",
						"segments.segmentTypeId",
						"segmentTypes.key as typeKey",
						"segmentTypes.label as typeLabel",
					])
					.where("segments.number", "=", 0)
					.as("seg"),
			(join) => join.onRef("seg.contentId", "=", "pages.id"),
		)
		.leftJoin(bestTranslationByPagesSubquery(locale).as("trans"), (join) =>
			join.onRef("trans.segmentId", "=", "seg.id"),
		)
		.select((eb) => [
			"pages.id",
			"pages.slug",
			"pages.parentId",
			"pages.order",
			"users.handle as userHandle",
			"seg.id as segmentId",
			"seg.text as segmentText",
			"seg.textAndOccurrenceHash as segmentHash",
			"seg.createdAt as segmentCreatedAt",
			"seg.segmentTypeId as segmentTypeId",
			"seg.typeKey as segmentTypeKey",
			"seg.typeLabel as segmentTypeLabel",
			"trans.id as translationId",
			"trans.text as translationText",
			eb
				.selectFrom("pages as c")
				.select(eb.fn.countAll().as("count"))
				.whereRef("c.parentId", "=", "pages.id")
				.where("c.status", "=", "PUBLIC")
				.as("childrenCount"),
		]);
}

export type PageForTitleTree = PageForTree & { children: PageForTitleTree[] };

/**
 * 子ページツリーを取得
 */
export async function fetchChildPagesTree(
	parentId: number,
	locale: string,
): Promise<PageForTitleTree[]> {
	const childrenByParent = new Map<number, PageForTree[]>();
	const seen = new Set<number>();
	let frontier: number[] = [parentId];

	while (frontier.length > 0) {
		const rows = (await buildPageTreeQuery(locale)
			.where("pages.status", "=", "PUBLIC")
			.where("pages.parentId", "in", frontier)
			.orderBy("pages.order", "asc")
			.execute()) as PageTreeRow[];

		if (rows.length === 0) break;

		const pages = rows.map((row) => ({
			id: row.id,
			slug: row.slug,
			userHandle: row.userHandle,
			titleSegment: toTitleSegment(row),
			parentId: row.parentId,
			order: row.order,
			childrenCount: Number(row.childrenCount ?? 0),
		}));

		for (const page of pages) {
			if (page.parentId === null) continue;
			const list = childrenByParent.get(page.parentId) ?? [];
			list.push(page);
			childrenByParent.set(page.parentId, list);
		}

		const next: number[] = [];
		for (const page of pages) {
			if (seen.has(page.id)) continue;
			seen.add(page.id);
			next.push(page.id);
		}
		frontier = next;
	}

	const buildTree = (id: number): PageForTitleTree[] => {
		const children = childrenByParent.get(id) ?? [];
		return children.map((child) => ({
			...child,
			children: buildTree(child.id),
		}));
	};

	return buildTree(parentId);
}

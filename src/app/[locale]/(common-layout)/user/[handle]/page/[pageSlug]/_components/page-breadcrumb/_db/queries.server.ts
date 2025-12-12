import { eq } from "drizzle-orm";
import { fetchSegmentsForPages } from "@/app/[locale]/_db/page-list-helpers.server";
import { getPageById } from "@/app/[locale]/_db/queries.server";
import type { SegmentForList } from "@/app/[locale]/types";
import type { SanitizedUser } from "@/app/types";
import { db } from "@/drizzle";
import { pages } from "@/drizzle/schema";

type ParentNode = {
	id: number;
	slug: string;
	order: number;
	sourceLocale: string;
	status: string;
	parentId: number | null;
	createdAt: string;
	user: SanitizedUser;
	content: { segments: SegmentForList[] };
	children: ParentNode[];
};

// 親ページの階層を取得する関数
// Drizzle版に移行済み
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
		const segments = await fetchSegmentsForPages([parent.id], locale);

		parentChain.unshift({
			id: parent.id,
			slug: parent.slug,
			order: parent.order,
			sourceLocale: parent.sourceLocale,
			status: parent.status,
			parentId: parent.parentId,
			createdAt: parent.createdAt.toISOString(),
			user: parent.user as SanitizedUser,
			content: {
				segments: segments,
			},
			children: [],
		});

		currentParentId = parent.parentId;
	}

	return parentChain;
}

// ページの親IDを取得する関数
// Drizzle版に移行済み
async function getParentId(pageId: number): Promise<number | null> {
	const result = await db
		.select({ parentId: pages.parentId })
		.from(pages)
		.where(eq(pages.id, pageId))
		.limit(1);
	return result[0]?.parentId ?? null;
}

import { eq } from "drizzle-orm";
import type { Root as MdastRoot } from "mdast";
import type { TransactionClient } from "@/app/[locale]/_service/sync-segments";
import { contents, pages } from "@/drizzle/schema";
import type { PageStatus } from "@/drizzle/types";

/**
 * ページをupsertする（DB操作のみ）
 * Drizzle版に移行済み
 * 既存の場合は1回のクエリで更新、新規の場合はcontents作成後にpagesをINSERT
 */
export async function upsertPage(
	tx: TransactionClient,
	p: {
		pageSlug: string;
		userId: string;
		mdastJson: MdastRoot;
		sourceLocale: string;
		parentId: number | null;
		order: number | null;
		status: PageStatus | null;
	},
) {
	// 既存ページのidを取得（1回のクエリ）
	const existing = await tx
		.select({ id: pages.id })
		.from(pages)
		.where(eq(pages.slug, p.pageSlug))
		.limit(1);

	if (existing.length > 0) {
		// 既存の場合はUPDATEで更新（PRIMARY KEY制約違反を避けるため）
		const updateData: {
			mdastJson: MdastRoot;
			sourceLocale: string;
			parentId?: number | null;
			order?: number;
			status?: PageStatus;
		} = {
			mdastJson: p.mdastJson,
			sourceLocale: p.sourceLocale,
		};

		if (p.parentId !== null) {
			updateData.parentId = p.parentId;
		}
		if (p.order !== null) {
			updateData.order = p.order;
		}
		if (p.status !== null) {
			updateData.status = p.status;
		}

		const [updated] = await tx
			.update(pages)
			.set(updateData)
			.where(eq(pages.slug, p.pageSlug))
			.returning();

		if (!updated) {
			throw new Error(`Failed to update page with slug ${p.pageSlug}`);
		}

		return updated;
	}

	// 新規作成: contentsを先に作成してからpagesをINSERT
	const [content] = await tx
		.insert(contents)
		.values({ kind: "PAGE" })
		.returning({ id: contents.id });

	if (!content) {
		throw new Error("Failed to create content row");
	}

	const [page] = await tx
		.insert(pages)
		.values({
			id: content.id,
			slug: p.pageSlug,
			userId: p.userId,
			mdastJson: p.mdastJson,
			sourceLocale: p.sourceLocale,
			parentId: p.parentId,
			order: p.order ?? 0,
			status: p.status ?? "DRAFT",
		})
		.returning();

	if (!page) {
		throw new Error(`Failed to create page with slug ${p.pageSlug}`);
	}

	return page;
}

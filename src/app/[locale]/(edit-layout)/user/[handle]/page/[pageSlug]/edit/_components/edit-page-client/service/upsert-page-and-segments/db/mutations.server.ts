import type { TransactionClient } from "@/app/[locale]/_service/sync-segments";
import type { JsonValue, Pagestatus } from "@/db/types";

/**
 * ページをupsertする（DB操作のみ）
 * Kysely版に移行済み
 * 既存の場合は1回のクエリで更新、新規の場合はcontents作成後にpagesをINSERT
 */
export async function upsertPage(
	tx: TransactionClient,
	p: {
		pageSlug: string;
		userId: string;
		mdastJson: JsonValue;
		sourceLocale: string;
		parentId: number | null;
		order: number | null;
		status: Pagestatus | null;
	},
) {
	// 既存ページのidを取得（1回のクエリ）
	const existing = await tx
		.selectFrom("pages")
		.select("id")
		.where("slug", "=", p.pageSlug)
		.executeTakeFirst();

	if (existing) {
		// 既存の場合はUPDATEで更新（PRIMARY KEY制約違反を避けるため）
		const updateData: {
			mdastJson: JsonValue;
			sourceLocale: string;
			parentId?: number | null;
			order?: number;
			status?: Pagestatus;
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

		const updated = await tx
			.updateTable("pages")
			.set(updateData)
			.where("slug", "=", p.pageSlug)
			.returningAll()
			.executeTakeFirst();

		if (!updated) {
			throw new Error(`Failed to update page with slug ${p.pageSlug}`);
		}

		return updated;
	}

	// 新規作成: contentsを先に作成してからpagesをINSERT
	const content = await tx
		.insertInto("contents")
		.values({ kind: "PAGE" })
		.returning(["id"])
		.executeTakeFirstOrThrow();

	const page = await tx
		.insertInto("pages")
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
		.returningAll()
		.executeTakeFirstOrThrow();

	return page;
}

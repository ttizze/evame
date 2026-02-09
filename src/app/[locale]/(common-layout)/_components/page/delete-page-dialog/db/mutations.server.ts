import { db } from "@/db";

/**
 * ページを削除済みテーブルへ退避し、関連データごと削除する
 */
export async function deletePage(pageId: number, userId: string) {
	return db.transaction().execute(async (trx) => {
		const page = await trx
			.selectFrom("pages")
			.selectAll()
			.where("id", "=", pageId)
			.where("userId", "=", userId)
			.executeTakeFirst();

		if (!page) {
			throw new Error("Page not found or unauthorized");
		}

		const movedPage = await trx
			.insertInto("deletedPages")
			.values({
				pageId: page.id,
				slug: page.slug,
				createdAt: page.createdAt,
				sourceLocale: page.sourceLocale,
				updatedAt: page.updatedAt,
				status: page.status,
				userId: page.userId,
				mdastJson: page.mdastJson,
				order: page.order,
				parentId: page.parentId,
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		// pages.id は contents.id を参照しているため、
		// contents を削除すると pages/segments も cascade で削除される。
		await trx.deleteFrom("contents").where("id", "=", page.id).execute();

		return movedPage;
	});
}

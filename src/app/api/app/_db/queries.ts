import type { Kysely } from "kysely";
import type { TransactionClient } from "@/app/[locale]/_service/sync-segments/types";
import { db } from "@/db";
import type { DB } from "@/db/types";

/** 題名（番号0の段落）と一緒にページを読む。 */
function selectDocumentPages(database: Kysely<DB> | TransactionClient) {
	return database
		.selectFrom("pages")
		.leftJoin("segments", (join) =>
			join
				.onRef("segments.contentId", "=", "pages.id")
				.on("segments.number", "=", 0),
		)
		.select([
			"pages.id",
			"pages.slug",
			"pages.userId",
			"pages.status",
			"pages.mdastJson",
			"segments.text as title",
		]);
}

export async function listDocumentPages(userId: string) {
	return await selectDocumentPages(db)
		.where("pages.userId", "=", userId)
		.where("pages.status", "!=", "ARCHIVE")
		.orderBy("pages.updatedAt", "desc")
		.execute();
}

export async function findDocumentPage(tx: TransactionClient, slug: string) {
	return await selectDocumentPages(tx)
		.where("pages.slug", "=", slug)
		.executeTakeFirst();
}

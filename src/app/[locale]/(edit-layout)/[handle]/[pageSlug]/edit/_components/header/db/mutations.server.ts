import type { Transaction } from "kysely";
import type { DB, PageStatus } from "@/db/types";

export async function updatePageStatus(
	tx: Transaction<DB>,
	pageId: number,
	status: PageStatus,
) {
	const updated = await tx
		.updateTable("pages")
		.set({ status })
		.where("id", "=", pageId)
		.returningAll()
		.executeTakeFirst();
	return updated;
}

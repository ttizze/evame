import type { Transaction } from "kysely";
import type { DB } from "@/db/types";
import {
	claimPagePublication,
	insertPublicationNotifications,
} from "../_db/mutations.server";

export async function notifyPagePublication(
	tx: Transaction<DB>,
	pageId: number,
) {
	const publication = await claimPagePublication(tx, pageId);
	if (!publication || publication.parentId !== null) return;
	await insertPublicationNotifications(tx, pageId, publication.userId);
}

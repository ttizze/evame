"use server";
import { z } from "zod";
import { deleteActionFactory } from "@/app/[locale]/_action/delete-action-factory";
import { archivePage } from "./db/mutations.server";
export const archivePageAction = deleteActionFactory({
	inputSchema: z.object({
		pageId: z.coerce.number(),
	}),
	deleteById: ({ pageId }, userId) =>
		archivePage(pageId, userId).then(() => {}),

	buildRevalidatePaths: (_input, userHandle) => [
		`/user/${userHandle}/page-management`,
		`/user/${userHandle}`,
	],
});

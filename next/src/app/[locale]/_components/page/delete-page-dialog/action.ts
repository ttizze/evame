"use server";
import { createDeleteAction } from "@/app/[locale]/_action/create-delete-action";
import { z } from "zod";
import { archivePage } from "./db/mutations.server";
export const archivePageAction = createDeleteAction({
	inputSchema: z.object({
		pageId: z.coerce.number(),
	}),
	deleteById: ({ pageId }, userId) =>
		archivePage(pageId, userId).then(() => {}),

	buildRevalidatePaths: (_input, userHandle) => [
		`/user/${userHandle}/page-management`,
	],

	buildSuccessRedirect: (_input, userHandle) =>
		`/user/${userHandle}/page-management`,
});

"use server";
import { z } from "zod";
import { deleteActionFactory } from "@/app/[locale]/_action/delete-action-factory";
import { deletePage } from "./db/mutations.server";
export const deletePageAction = deleteActionFactory({
	inputSchema: z.object({
		pageId: z.coerce.number(),
	}),
	deleteById: ({ pageId }, userId) => deletePage(pageId, userId).then(() => {}),
});

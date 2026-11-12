import { createServerFn } from "@tanstack/react-start";
import {
	getRequestHeaders,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { z } from "zod";
import { localeSchema } from "@/app/_utils/locale-schema";
import type { ActionResponse } from "@/app/types";
import { updatePageStatus } from "../_service/update-page-status";

const togglePublishSchema = z.object({
	pageId: z.number().int().positive(),
	locale: localeSchema,
});

export type TogglePublishState = ActionResponse<
	undefined,
	{
		pageId: number;
		locale: string;
	}
>;

export const togglePublishAction = createServerFn({ method: "POST" })
	.validator(togglePublishSchema)
	.handler(async ({ data }): Promise<TogglePublishState> => {
		setResponseHeader("Cache-Control", "private, no-store");
		setResponseHeader("Vary", "Cookie");

		return updatePageStatus(
			{ pageId: data.pageId, locale: data.locale, operation: "togglePublish" },
			new Headers(getRequestHeaders()),
		);
	});

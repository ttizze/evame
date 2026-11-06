import { createServerFn } from "@tanstack/react-start";
import {
	getRequestHeaders,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { updatePageStatus } from "@/app/api/reader-actions/_service/update-page-status";
import type { ActionResponse } from "@/app/types";

const togglePublishSchema = z.object({
	pageId: z.number().int().positive(),
	locale: z
		.string()
		.refine((locale) =>
			supportedLocaleOptions.some((option) => option.code === locale),
		),
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

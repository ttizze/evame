import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
	getRequestHeaders,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import type { ActionResponse } from "@/app/types";
import { archivePage } from "./db/mutations.server";

const archivePageSchema = z.object({
	pageId: z.number().int().positive(),
	locale: z
		.string()
		.refine((locale) =>
			supportedLocaleOptions.some((option) => option.code === locale),
		),
});

export type ArchivePageState = ActionResponse<
	undefined,
	{
		pageId: number;
		locale: string;
	}
>;

export const archivePageAction = createServerFn({ method: "POST" })
	.validator(archivePageSchema)
	.handler(async ({ data }): Promise<ArchivePageState> => {
		setResponseHeader("Cache-Control", "private, no-store");
		setResponseHeader("Vary", "Cookie");

		const currentUser = await getCurrentUserFromHeaders(
			new Headers(getRequestHeaders()),
		);
		if (!currentUser) {
			throw redirect({ href: `/${data.locale}/auth/login` });
		}

		await archivePage(data.pageId, currentUser.id);
		return {
			success: true,
			data: undefined,
			message: "Deleted successfully",
		};
	});

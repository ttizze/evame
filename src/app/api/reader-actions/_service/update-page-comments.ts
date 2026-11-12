import { redirect } from "@tanstack/react-router";
import { z } from "zod";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { localeSchema } from "@/app/_utils/locale-schema";
import type { ActionResponse } from "@/app/types";
import { setPageCommentsEnabled } from "../_db/mutations";

const input = z.object({
	pageId: z.number().int().positive(),
	enabled: z.boolean(),
	locale: localeSchema,
});

export async function updatePageComments(
	data: z.input<typeof input>,
	headers: Headers,
): Promise<ActionResponse<{ commentsEnabled: boolean }>> {
	const { pageId, enabled, locale } = input.parse(data);
	const user = await getCurrentUserFromHeaders(headers);
	if (!user) throw redirect({ href: `/${locale}/auth/login` });
	const result = await setPageCommentsEnabled(pageId, user.id, enabled);
	return result
		? { success: true, data: result }
		: { success: false, message: "Page not found" };
}

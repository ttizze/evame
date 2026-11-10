import { redirect } from "@tanstack/react-router";
import { z } from "zod";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { localeSchema } from "@/app/_utils/locale-schema";
import { archivePage } from "@/app/[locale]/(common-layout)/_components/page/delete-page-dialog/db/mutations.server";
import { togglePagePublicStatus } from "@/app/[locale]/(common-layout)/_components/page/page-actions-dropdown/db/mutations.server";
import type { ActionResponse } from "@/app/types";

const input = z.object({
	pageId: z.number().int().positive(),
	operation: z.enum(["togglePublish", "archive"]),
	locale: localeSchema,
});
export async function updatePageStatus(
	data: z.input<typeof input>,
	requestHeaders: Headers,
): Promise<ActionResponse<undefined>> {
	const { pageId, operation, locale } = input.parse(data);
	const user = await getCurrentUserFromHeaders(requestHeaders);
	if (!user) throw redirect({ href: `/${locale}/auth/login` });
	if (operation === "archive") await archivePage(pageId, user.id);
	else await togglePagePublicStatus(pageId, user.id);
	return {
		success: true,
		data: undefined,
		message:
			operation === "archive"
				? "Deleted successfully"
				: "Page status updated successfully",
	};
}

import { createServerFn } from "@tanstack/react-start";
import {
	getRequestHeaders,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import type { ActionResponse } from "@/app/types";

const followActionSchema = z.object({
	targetUserId: z.string().min(1),
	action: z.enum(["follow", "unFollow"]),
	locale: z
		.string()
		.refine(
			(locale) =>
				supportedLocaleOptions.some((option) => option.code === locale),
			"対応していないlocaleです",
		),
});

export type FollowActionResponse = ActionResponse<
	{ isFollowing: boolean },
	{
		targetUserId: string;
		action: "follow" | "unFollow";
		locale: string;
	}
>;

async function getCurrentUser() {
	const { getCurrentUserFromHeaders } = await import(
		"@/app/_service/current-user"
	);
	return getCurrentUserFromHeaders(new Headers(getRequestHeaders()));
}

export const followAction = createServerFn({ method: "POST" })
	.inputValidator(followActionSchema)
	.handler(async ({ data }): Promise<FollowActionResponse> => {
		setResponseHeader("Cache-Control", "private, no-store");
		setResponseHeader("Vary", "Cookie");
		const currentUser = await getCurrentUser();

		if (!currentUser) {
			const { redirect } = await import("@tanstack/react-router");
			throw redirect({ href: `/${data.locale}/auth/login` });
		}
		if (currentUser.id === data.targetUserId) {
			return { success: false, message: "Cannot follow yourself" };
		}

		const { createFollow, createNotificationFollow, deleteFollow } =
			await import("./db/mutations.server");
		if (data.action === "follow") {
			await createFollow(currentUser.id, data.targetUserId);
			await createNotificationFollow(currentUser.id, data.targetUserId);
			return { success: true, data: { isFollowing: true } };
		}

		await deleteFollow(currentUser.id, data.targetUserId);
		return { success: true, data: { isFollowing: false } };
	});

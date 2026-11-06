import { redirect } from "@tanstack/react-router";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import {
	createFollow,
	createNotificationFollow,
	deleteFollow,
} from "@/app/[locale]/(common-layout)/[handle]/_components/follow-button/db/mutations.server";
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

export async function followAction(
	input: z.input<typeof followActionSchema>,
	requestHeaders: Headers,
): Promise<FollowActionResponse> {
	const data = followActionSchema.parse(input);

	const currentUser = await getCurrentUserFromHeaders(requestHeaders);

	if (!currentUser) {
		throw redirect({ href: `/${data.locale}/auth/login` });
	}
	if (currentUser.id === data.targetUserId) {
		return { success: false, message: "Cannot follow yourself" };
	}

	if (data.action === "follow") {
		await createFollow(currentUser.id, data.targetUserId);
		await createNotificationFollow(currentUser.id, data.targetUserId);
		return { success: true, data: { isFollowing: true } };
	}

	await deleteFollow(currentUser.id, data.targetUserId);
	return { success: true, data: { isFollowing: false } };
}

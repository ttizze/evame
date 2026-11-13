import { redirect } from "@tanstack/react-router";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import type { ActionResponse } from "@/app/types";
import { runTransaction } from "@/db/transaction";
import {
	createFollow,
	createNotificationFollow,
	deleteFollow,
} from "./follow-user/db/mutations.server";

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
		await runTransaction(async (tx) => {
			const created = await createFollow(tx, currentUser.id, data.targetUserId);
			if (created)
				await createNotificationFollow(tx, currentUser.id, data.targetUserId);
		});
		return { success: true, data: { isFollowing: true } };
	}

	await runTransaction((tx) =>
		deleteFollow(tx, currentUser.id, data.targetUserId),
	);
	return { success: true, data: { isFollowing: false } };
}

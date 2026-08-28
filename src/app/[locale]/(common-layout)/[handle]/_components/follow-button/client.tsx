"use client";

import { useServerFn } from "@tanstack/react-start";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { type FollowActionResponse, followAction } from "./action";

interface FollowButtonProps {
	targetUserId: string;
	isFollowing: boolean;
	locale?: string;
}

export function FollowButtonClient({
	targetUserId,
	isFollowing,
	locale = "en",
}: FollowButtonProps) {
	const followActionFn = useServerFn(followAction);
	const [state, formAction, isPending] = useActionState<
		FollowActionResponse,
		FormData
	>(
		async (_previousState, formData) => {
			const action =
				formData.get("action") === "unFollow" ? "unFollow" : "follow";
			return followActionFn({
				data: {
					action,
					locale: String(formData.get("locale") ?? locale),
					targetUserId: String(formData.get("targetUserId") ?? targetUserId),
				},
			});
		},
		{ success: true, data: { isFollowing } },
	);

	return (
		<form action={formAction}>
			<input name="targetUserId" type="hidden" value={targetUserId} />
			<input name="locale" type="hidden" value={locale} />
			<input
				name="action"
				type="hidden"
				value={state.success && state.data?.isFollowing ? "unFollow" : "follow"}
			/>
			<Button
				className="rounded-full"
				disabled={isPending}
				variant={
					state.success && state.data?.isFollowing ? "outline" : "default"
				}
			>
				{state.success && state.data?.isFollowing ? "Following" : "Follow"}
			</Button>
			{state.message && <p>{state.message}</p>}
		</form>
	);
}

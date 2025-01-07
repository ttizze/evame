import { type ActionFunctionArgs, data } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { authenticator } from "~/utils/auth.server";
import { createFollow, deleteFollow } from "./db/mutations.server";

export async function action({ request }: ActionFunctionArgs) {
	const user = await authenticator.isAuthenticated(request, {
		failureRedirect: "/auth/login",
	});

	const formData = await request.formData();
	const targetUserId = formData.get("targetUserId");
	const action = formData.get("action");

	if (!targetUserId || typeof targetUserId !== "string") {
		return data({ error: "Invalid request" }, { status: 400 });
	}

	if (user.id === Number.parseInt(targetUserId, 10)) {
		return data({ error: "Cannot follow yourself" }, { status: 400 });
	}

	try {
		if (action === "follow") {
			await createFollow(user.id, Number.parseInt(targetUserId, 10));
		} else if (action === "unfollow") {
			await deleteFollow(user.id, Number.parseInt(targetUserId, 10));
		}

		return data({ success: true });
	} catch (error) {
		console.error("Follow action error:", error);
		return data({ error: "Failed to process follow action" }, { status: 500 });
	}
}

interface FollowButtonProps {
	targetUserId: number;
	isFollowing: boolean;
	className?: string;
}

function FollowButton({
	targetUserId,
	isFollowing,
	className,
}: FollowButtonProps) {
	const fetcher = useFetcher();
	const isLoading = fetcher.state !== "idle";

	return (
		<fetcher.Form method="post" action="/resources/follow-button">
			<input type="hidden" name="targetUserId" value={targetUserId} />
			<input
				type="hidden"
				name="action"
				value={isFollowing ? "unfollow" : "follow"}
			/>
			<Button
				variant={isFollowing ? "outline" : "default"}
				className={className}
				disabled={isLoading}
			>
				{isFollowing ? "Following" : "Follow"}
			</Button>
		</fetcher.Form>
	);
}

export { FollowButton };

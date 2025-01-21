import type { ActionFunctionArgs } from "@remix-run/node";
import { data } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import { Heart } from "lucide-react";
import { Button } from "~/components/ui/button";
import { authenticator } from "~/utils/auth.server";
import { ensureGuestId } from "~/utils/ensureGuestId.server";
import { commitSession } from "~/utils/session.server";
import { toggleLike } from "./functions/mutations.server";

export async function action({ params, request }: ActionFunctionArgs) {
	const currentUser = await authenticator.isAuthenticated(request);
	const { session, guestId } = await ensureGuestId(request);

	const formData = await request.formData();
	const slug = formData.get("slug") as string;
	const liked = await toggleLike(slug, currentUser?.id, guestId);
	const headers = new Headers();
	headers.set("Set-Cookie", await commitSession(session));
	return data(
		{ liked },
		{
			headers,
		},
	);
}

type LikeButtonProps = {
	liked: boolean;
	likeCount: number;
	slug: string;
	showCount?: boolean;
	className?: string;
};

export function LikeButton({
	liked,
	likeCount,
	slug,
	showCount,
	className = "",
}: LikeButtonProps) {
	const fetcher = useFetcher<typeof action>();

	return (
		<div className="flex items-center gap-2">
			<fetcher.Form method="post" action={"/resources/like-button"}>
				<input type="hidden" name="slug" value={slug} />
				<Button
					type="submit"
					aria-label="Like"
					variant="ghost"
					size="icon"
					className={`h-12 w-12 rounded-full border bg-background ${className}`}
					disabled={fetcher.state === "submitting"}
				>
					<Heart
						className={`h-5 w-5 ${liked ? "text-red-500" : ""}`}
						fill={liked ? "currentColor" : "none"}
					/>
				</Button>
			</fetcher.Form>
			{showCount && <span className="text-muted-foreground">{likeCount}</span>}
		</div>
	);
}

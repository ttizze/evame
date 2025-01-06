import type { ActionFunctionArgs } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import { Heart } from "lucide-react";
import { Button } from "~/components/ui/button";
import { authenticator } from "~/utils/auth.server";
import { commitSession, getSession } from "~/utils/session.server";
import { toggleLike } from "./functions/mutations.server";
export async function action({ params, request }: ActionFunctionArgs) {
	const currentUser = await authenticator.isAuthenticated(request);
	const session = await getSession(request.headers.get("Cookie"));
	let guestId = session.get("guestId");
	if (!currentUser && !guestId) {
		guestId = crypto.randomUUID();
		session.set("guestId", guestId);
	}
	const headers = new Headers();
	headers.set("Set-Cookie", await commitSession(session));

	const formData = await request.formData();
	const slug = formData.get("slug") as string;
	const liked = await toggleLike(slug, currentUser?.id, guestId);
	return new Response(JSON.stringify({ liked }), {
		headers: { "Set-Cookie": await commitSession(session) },
	});
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

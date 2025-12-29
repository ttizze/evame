"use client";

import { Heart, Loader2 } from "lucide-react";
import { useActionState, useEffect } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { type PageLikeButtonState, togglePageLikeAction } from "./action";

type PageLikeButtonClientProps = {
	pageId: number;
	showCount?: boolean;
	className?: string;
};

export function PageLikeButtonClient({
	pageId,
	showCount,
	className = "",
}: PageLikeButtonClientProps) {
	const fetcher = (url: string) =>
		fetch(url, { credentials: "include" }).then((r) => {
			if (!r.ok) throw new Error("failed");
			return r.json() as Promise<{ liked: boolean; likeCount: number }>;
		});
	const { data, mutate, isLoading } = useSWR(
		`/api/page-likes/${pageId}/state`,
		fetcher,
		{
			revalidateOnFocus: false,
		},
	);

	// Server action returns latest liked/count; prefer it when available
	const [actionState, formAction, isPending] = useActionState<
		PageLikeButtonState,
		FormData
	>(togglePageLikeAction, { success: false });

	type LikeState = { liked: boolean; likeCount: number };

	const handleSubmit = (formData: FormData) => {
		// Guard until initial state is loaded
		if (!data) return;

		// Compute and broadcast optimistic next state for all instances
		const next: LikeState = {
			liked: !data.liked,
			likeCount: data.likeCount + (data.liked ? -1 : 1),
		};
		mutate(next, { revalidate: false });

		// Trigger server action
		formAction(formData);
	};

	useEffect(() => {
		if (actionState.success) {
			void mutate();
		}
	}, [actionState.success, mutate]);

	return (
		<div className="flex items-center gap-2">
			<form action={handleSubmit}>
				<input name="pageId" type="hidden" value={pageId} />
				<Button
					aria-label="Like"
					className={`bg-background ${className}`}
					disabled={isPending || isLoading}
					size="icon"
					type="submit"
					variant="ghost"
				>
					{isPending || isLoading ? (
						<Loader2 className="h-5 w-5 rounded-full" />
					) : (
						<Heart
							className={`h-5 w-5 rounded-full ${data?.liked ? "text-red-500" : ""}`}
							fill={data?.liked ? "currentColor" : "none"}
						/>
					)}
				</Button>
			</form>
			{showCount && data && (
				<span className="text-muted-foreground">{data.likeCount}</span>
			)}
		</div>
	);
}

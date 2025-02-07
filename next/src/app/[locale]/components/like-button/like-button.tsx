"use client";

import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useActionState, useOptimistic } from "react";
import { type LikeButtonState, toggleLikeAction } from "./action";
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
	const [state, formAction, isPending] = useActionState<
		LikeButtonState,
		FormData
	>(toggleLikeAction, {});
	const [optimisticLiked, setOptimisticLiked] = useOptimistic(
		liked,
		(state, liked: boolean) => liked,
	);

	const [optimisticCount, setOptimisticCount] = useOptimistic(
		likeCount,
		(state, increment: boolean) => (increment ? state + 1 : state - 1),
	);
	const handleSubmit = async (formData: FormData) => {
		setOptimisticLiked(!optimisticLiked);
		setOptimisticCount(!optimisticLiked);
		formAction(formData);
	};
	return (
		<div className="flex items-center gap-2">
			<form action={handleSubmit}>
				<input type="hidden" name="slug" value={slug} />
				<Button
					type="submit"
					aria-label="Like"
					variant="ghost"
					size="icon"
					className={`h-12 w-12 rounded-full border bg-background ${className}`}
					disabled={isPending}
				>
					<Heart
						className={`h-5 w-5 ${optimisticLiked ? "text-red-500" : ""}`}
						fill={optimisticLiked ? "currentColor" : "none"}
					/>
				</Button>
			</form>
			{showCount && (
				<span className="text-muted-foreground">{optimisticCount}</span>
			)}
		</div>
	);
}

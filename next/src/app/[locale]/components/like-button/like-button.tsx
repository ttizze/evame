"use client";

import type { ActionState } from "@/app/types";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useActionState } from "react";
import { toggleLikeAction } from "./action";
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
	const [state, formAction, isPending] = useActionState<ActionState, FormData>(
		toggleLikeAction,
		{ error: "" },
	);
	console.log("state", state);
	return (
		<div className="flex items-center gap-2">
			<form action={formAction}>
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
						className={`h-5 w-5 ${liked ? "text-red-500" : ""}`}
						fill={liked ? "currentColor" : "none"}
					/>
				</Button>
			</form>
			{showCount && <span className="text-muted-foreground">{likeCount}</span>}
		</div>
	);
}

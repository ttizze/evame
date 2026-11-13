import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LikeButton({
	pageId,
	likeCount,
	liked,
	pending,
	disabled,
	onClick,
}: {
	pageId: number;
	likeCount: number | null;
	liked: boolean;
	pending: boolean;
	disabled: boolean;
	onClick: (() => void) | null;
}) {
	return (
		<div className="flex items-center gap-2">
			<Button
				aria-label="Like"
				aria-pressed={liked}
				className="bg-background cursor-pointer"
				data-like-page={pageId}
				disabled={disabled}
				onClick={onClick ?? undefined}
				size="icon"
				type="button"
				variant="ghost"
			>
				<Heart
					className={`h-5 w-5 rounded-full ${liked ? "text-red-500" : ""}`}
					data-like-heart
					fill={liked ? "currentColor" : "none"}
					style={pending ? { display: "none" } : undefined}
				/>
				<span data-like-pending hidden={!pending}>
					<Loader2 className="h-5 w-5 rounded-full" />
				</span>
			</Button>
			{likeCount !== null && (
				<span className="text-muted-foreground" data-like-count={pageId}>
					{likeCount}
				</span>
			)}
		</div>
	);
}

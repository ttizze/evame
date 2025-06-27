"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

type PageCommentButtonProps = {
	commentCount: number;
	slug: string;
	userHandle?: string;
	showCount?: boolean;
	className?: string;
};

export function PageCommentButton({
	commentCount,
	slug,
	userHandle,
	showCount = true,
	className = "",
}: PageCommentButtonProps) {
	// Construct the URL to the page's comment section
	const commentUrl = userHandle
		? `/user/${userHandle}/page/${slug}#comments`
		: `/page/${slug}#comments`;

	return (
		<div className="flex items-center gap-2">
			<Link href={commentUrl}>
				<Button
					aria-label="Comments"
					variant="ghost"
					size="icon"
					className={`${className}`}
				>
					<MessageCircle className="h-5 w-5 rounded-full" />
				</Button>
			</Link>
			{showCount && (
				<span className="text-muted-foreground">{commentCount}</span>
			)}
		</div>
	);
}

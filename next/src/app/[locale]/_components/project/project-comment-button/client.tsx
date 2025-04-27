"use client";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { MessageCircle } from "lucide-react";

type ProjectCommentButtonProps = {
	commentCount: number;
	projectId: string;
	userHandle?: string;
	showCount?: boolean;
	className?: string;
};

export function ProjectCommentButton({
	commentCount,
	userHandle,
	projectId,
	showCount = true,
	className = "",
}: ProjectCommentButtonProps) {
	// Construct the URL to the page's comment section
	const commentUrl = userHandle
		? `/user/${userHandle}/project/${projectId}#comments`
		: `/project/${projectId}#comments`;

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

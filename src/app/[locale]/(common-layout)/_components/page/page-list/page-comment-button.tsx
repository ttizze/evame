"use client";

import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type PageCommentButtonProps = {
	commentCount: number;
	pageSlug: string;
	pageOwnerHandle: string;
	locale: string;
	showCount?: boolean;
	className?: string;
};

export function PageCommentButton({
	commentCount,
	pageSlug,
	pageOwnerHandle,
	locale,
	showCount = true,
	className = "",
}: PageCommentButtonProps) {
	return (
		<div className="flex items-center gap-2">
			<Button
				aria-label="Comments"
				asChild
				className={className}
				size="icon"
				variant="ghost"
			>
				<Link
					hash="comments"
					params={{ handle: pageOwnerHandle, locale, pageSlug }}
					to="/$locale/$handle/$pageSlug"
				>
					<MessageCircle className="h-5 w-5 rounded-full" />
				</Link>
			</Button>
			{showCount && (
				<span className="text-muted-foreground">{commentCount}</span>
			)}
		</div>
	);
}

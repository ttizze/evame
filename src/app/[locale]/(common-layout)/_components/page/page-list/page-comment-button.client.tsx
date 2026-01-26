"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

type PageCommentButtonProps = {
	commentCount: number;
	pageSlug: string;
	pageOwnerHandle: string;
	showCount?: boolean;
	className?: string;
};

export function PageCommentButton({
	commentCount,
	pageSlug,
	pageOwnerHandle,
	showCount = true,
	className = "",
}: PageCommentButtonProps) {
	return (
		<div className="flex items-center gap-2">
			<Link href={`/${pageOwnerHandle}/${pageSlug}#comments`}>
				<Button
					aria-label="Comments"
					className={`${className}`}
					size="icon"
					variant="ghost"
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

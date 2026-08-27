import type { ReactNode } from "react";
import { PageLikeButtonClient } from "./client";

export function PageLikeButton({
	pageId,
	showCount = true,
	className,
	initialLikeCount,
	initialLiked,
}: {
	pageId: number;
	showCount?: boolean;
	className?: string;
	initialLikeCount: number;
	initialLiked?: boolean;
}): ReactNode {
	return (
		<PageLikeButtonClient
			className={className}
			initialLikeCount={initialLikeCount}
			initialLiked={initialLiked}
			pageId={pageId}
			showCount={showCount}
		/>
	);
}

import { PageLikeButtonClient } from "./client";

interface PageLikeButtonProps {
	pageId: number;
	showCount?: boolean;
	className?: string;
	initialLikeCount: number;
	initialLiked?: boolean;
}

export async function PageLikeButton({
	pageId,
	showCount = true,
	className,
	initialLikeCount,
	initialLiked,
}: PageLikeButtonProps) {
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

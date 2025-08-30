import { PageLikeButtonClient } from "./client";

interface PageLikeButtonProps {
	pageId: number;
	showCount?: boolean;
	className?: string;
}

export async function PageLikeButton({
	pageId,
	showCount = true,
	className,
}: PageLikeButtonProps) {
	return (
		<PageLikeButtonClient
			className={className}
			pageId={pageId}
			showCount={showCount}
		/>
	);
}

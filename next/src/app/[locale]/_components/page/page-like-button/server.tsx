import { getCurrentUser } from "@/auth";
import { PageLikeButtonClient } from "./client";
import { getPageLikeAndCount } from "./db/queries.server";

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
	const currentUser = await getCurrentUser();

	const { liked, likeCount } = await getPageLikeAndCount(
		pageId,
		currentUser?.id ?? "",
	);
	return (
		<PageLikeButtonClient
			liked={liked}
			likeCount={likeCount}
			pageId={pageId}
			showCount={showCount}
			className={className}
		/>
	);
}

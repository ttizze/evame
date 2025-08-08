import { getCurrentUser } from "@/lib/auth-server";
import { PageLikeButtonClient } from "./client";
import { getPageLikeAndCount } from "./db/queries.server";

interface PageLikeButtonProps {
	pageId: number;
	pageSlug: string;
	pageOwnerHandle: string;
	showCount?: boolean;
	className?: string;
}

export async function PageLikeButton({
	pageId,
	pageSlug,
	pageOwnerHandle,
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
			className={className}
			likeCount={likeCount}
			liked={liked}
			pageId={pageId}
			pageOwnerHandle={pageOwnerHandle}
			pageSlug={pageSlug}
			showCount={showCount}
		/>
	);
}

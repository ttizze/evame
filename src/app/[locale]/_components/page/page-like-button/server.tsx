import { getCurrentUser } from "@/auth";
import { PageLikeButtonClient } from "./client";
import { getPageLikeAndCount } from "./db/queries.server";

interface PageLikeButtonProps {
	pageId: number;
	pageSlug: string;
	ownerHandle: string;
	showCount?: boolean;
	className?: string;
}

export async function PageLikeButton({
	pageId,
	pageSlug,
	ownerHandle,
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
			ownerHandle={ownerHandle}
			pageId={pageId}
			pageSlug={pageSlug}
			showCount={showCount}
		/>
	);
}

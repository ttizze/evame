import { PageLikeButtonClient } from "@/app/[locale]/(common-layout)/_components/page/page-like-button/client";

export function LikeIsland({
	pageId,
	likeCount,
}: {
	pageId: number;
	likeCount: number;
}) {
	return (
		<PageLikeButtonClient
			initialLikeCount={likeCount}
			pageId={pageId}
			showCount
		/>
	);
}

import { EyeIcon } from "lucide-react";
import { getImageProps } from "next/image";
import { BASE_URL } from "@/app/_constants/base-url";
import { ClientDateFormatter } from "@/app/[locale]/_components/client-date-formatter";
import { PageCommentButton } from "@/app/[locale]/_components/page/page-comment-button/client";
import { PageLikeButton } from "@/app/[locale]/_components/page/page-like-button/server";
import { PageTagList } from "@/app/[locale]/_components/page/page-tag-list";
import { WrapSegmentsComponent } from "@/app/[locale]/_components/wrap-segments-component/server";
import { fetchPageViewCount } from "@/app/[locale]/_db/page-queries.server";
import type { PageSummary } from "@/app/[locale]/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@/i18n/routing";
import { PageActionsDropdown } from "./page-actions-dropdown/client";

type PageListProps = {
	pageSummary: PageSummary;
	showOwnerActions?: boolean;
	index?: number;
	locale: string;
	currentUserHandle?: string;
};

export async function PageList({
	pageSummary,
	showOwnerActions = false,
	index,
	locale,
	currentUserHandle,
}: PageListProps) {
	const { props } = getImageProps({
		src: pageSummary.user.image,
		alt: "",
		width: 40,
		height: 40,
	});
	// Get the title segment (which should be the first segment)
	const titleSegment = pageSummary.segmentBundles.find(
		(s) => s.segment.number === 0,
	);
	const _ogpImageUrl =
		`${BASE_URL}/api/og?locale=${locale}` + `&slug=${pageSummary.slug}`;
	const pageLink = `/user/${pageSummary.user.handle}/page/${pageSummary.slug}`;
	const userLink = `/user/${pageSummary.user.handle}`;
	const viewCount = await fetchPageViewCount(pageSummary.id);
	return (
		<article
			className={`grid gap-4 py-4 border-b last:border-b-0 ${
				index !== undefined ? "grid-cols-[max-content_1fr]" : "grid-cols-1"
			}`}
		>
			{/* ───── 1) インデックス番号 ───── */}
			{index !== undefined && (
				<div className="text-lg font-medium text-muted-foreground self-start">
					{index + 1}
				</div>
			)}

			{/* ───── 2) コンテンツ領域 ───── */}
			{/**
			 * コンテンツ領域は 3 行の Grid:
			 *   row‑1: タイトル行（タイトル + 操作ドロップダウン）
			 *   row‑2: タグ行
			 *   row‑3: フッター行（ユーザ & 日付 & ボタン）
			 */}
			<div className="grid grid-rows-[auto_auto_auto_auto] gap-1 min-w-0">
				{/* ─ row‑1: タイトル & オーナーアクション ─ */}
				<div className="grid grid-cols-[1fr_auto] gap-2">
					<Link className="block overflow-hidden" href={pageLink}>
						{titleSegment && (
							<WrapSegmentsComponent
								bundle={titleSegment}
								className="line-clamp-1 break-all overflow-wrap-anywhere"
								currentHandle={currentUserHandle}
								interactive={false}
							/>
						)}
					</Link>
					{showOwnerActions && (
						<PageActionsDropdown
							editPath={`${pageLink}/edit`}
							pageId={pageSummary.id}
							status={pageSummary.status}
						/>
					)}
				</div>

				{/* ─ row-2: タグリスト ─ */}
				<PageTagList tag={pageSummary.tagPages.map((t) => t.tag)} />

				{/* ─ row-3: ユーザ情報 + ボタン ─ */}
				<div className="flex items-center gap-2">
					<Link className="flex items-center gap-1 min-w-0" href={userLink}>
						<Avatar className="w-5 h-5 shrink-0">
							<AvatarImage {...props} />
							<AvatarFallback>
								{pageSummary.user.handle.charAt(0).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<span className="text-xs text-gray-600 truncate">
							{pageSummary.user.name}
						</span>
					</Link>
					<time
						className="text-xs text-muted-foreground whitespace-nowrap"
						dateTime={pageSummary.createdAt}
					>
						<ClientDateFormatter date={new Date(pageSummary.createdAt)} />
					</time>
				</div>

				{/* ③ アクション（いいね＋コメント） */}
				<div className="flex items-center gap-2 justify-end">
					<EyeIcon className="w-5 h-5" />
					<span className="text-muted-foreground">{viewCount}</span>
					<PageLikeButton
						ownerHandle={pageSummary.user.handle}
						pageId={pageSummary.id}
						pageSlug={pageSummary.slug}
					/>
					<PageCommentButton
						commentCount={pageSummary._count?.pageComments ?? 0}
						showCount
						slug={pageSummary.slug}
						userHandle={pageSummary.user.handle}
					/>
				</div>
			</div>
		</article>
	);
}

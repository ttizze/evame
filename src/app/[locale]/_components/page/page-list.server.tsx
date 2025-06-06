import { ClientDateFormatter } from "@/app/[locale]/_components/client-date-formatter";
import { PageCommentButton } from "@/app/[locale]/_components/page/page-comment-button/client";
import { PageLikeButton } from "@/app/[locale]/_components/page/page-like-button/server";
import { PageTagList } from "@/app/[locale]/_components/page/page-tag-list";
import { SegmentAndTranslationSection } from "@/app/[locale]/_components/segment-and-translation-section/client";
import type { PageSummary } from "@/app/[locale]/types";
import { BASE_URL } from "@/app/_constants/base-url";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@/i18n/routing";
import { getImageProps } from "next/image";
import { PageActionsDropdown } from "./page-actions-dropdown/client";
type PageListProps = {
	pageSummary: PageSummary;
	showOwnerActions?: boolean;
	index?: number;
	locale: string;
	currentUserHandle?: string;
};

export function PageList({
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
	const ogpImageUrl =
		`${BASE_URL}/api/og?locale=${locale}` + `&slug=${pageSummary.slug}`;
	const pageLink = `/user/${pageSummary.user.handle}/page/${pageSummary.slug}`;
	const userLink = `/user/${pageSummary.user.handle}`;
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
			 * コンテンツ領域は 3 行の Grid:
			 *   row‑1: タイトル行（タイトル + 操作ドロップダウン）
			 *   row‑2: タグ行
			 *   row‑3: フッター行（ユーザ & 日付 & ボタン）
			 */}
			<div className="grid grid-rows-[auto_auto_auto_auto] gap-1 min-w-0">
				{/* ─ row‑1: タイトル & オーナーアクション ─ */}
				<div className="grid grid-cols-[1fr_auto] gap-2">
					<Link href={pageLink} className="block overflow-hidden">
						{titleSegment && (
							<SegmentAndTranslationSection
								segmentBundle={titleSegment}
								currentHandle={currentUserHandle}
								segmentTextClassName="line-clamp-1 break-all overflow-wrap-anywhere"
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

				{/* ─ row‑2: タグリスト ─ */}
				<PageTagList tag={pageSummary.tagPages.map((t) => t.tag)} />

				{/* ─ row‑3: ユーザ情報 + ボタン ─ */}
				<div className="flex items-center gap-2">
					<Link href={userLink} className="flex items-center gap-1 min-w-0">
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
					<PageLikeButton
						pageId={pageSummary.id}
						pageSlug={pageSummary.slug}
						ownerHandle={pageSummary.user.handle}
					/>
					<PageCommentButton
						commentCount={pageSummary._count?.pageComments ?? 0}
						slug={pageSummary.slug}
						userHandle={pageSummary.user.handle}
						showCount
					/>
				</div>
			</div>
		</article>
	);
}

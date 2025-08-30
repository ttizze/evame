import { EyeIcon } from "lucide-react";
import { getImageProps } from "next/image";
import { BASE_URL } from "@/app/_constants/base-url";
import { PageCommentButton } from "@/app/[locale]/_components/page/page-comment-button/client";
import { PageLikeButton } from "@/app/[locale]/_components/page/page-like-button/server";
import { PageTagList } from "@/app/[locale]/_components/page/page-tag-list";
import { WrapSegmentsComponent } from "@/app/[locale]/_components/wrap-segments-component/server";
import { fetchPageViewCount } from "@/app/[locale]/_db/page-utility-queries.server";
import type { PageForList } from "@/app/[locale]/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@/i18n/routing";
import { PageActionsDropdown } from "./page-actions-dropdown/client";

type PageListProps = {
	PageForList: PageForList;
	showOwnerActions?: boolean;
	index?: number;
	locale: string;
};

export async function PageList({
	PageForList,
	showOwnerActions = false,
	index,
	locale,
}: PageListProps) {
	const { props } = getImageProps({
		src: PageForList.user.image,
		alt: "",
		width: 40,
		height: 40,
	});
	// Get the title segment (which should be the first segment)
	const titleSegment = PageForList.content.segments.find((s) => s.number === 0);
	const _ogpImageUrl =
		`${BASE_URL}/api/og?locale=${locale}` + `&slug=${PageForList.slug}`;
	const pageLink = `/user/${PageForList.user.handle}/page/${PageForList.slug}`;
	const userLink = `/user/${PageForList.user.handle}`;
	const viewCount = await fetchPageViewCount(PageForList.id);
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
								className="line-clamp-1 break-all overflow-wrap-anywhere"
								interactive={false}
								segment={titleSegment}
							/>
						)}
					</Link>
					{showOwnerActions && (
						<PageActionsDropdown
							editPath={`${pageLink}/edit`}
							pageId={PageForList.id}
							status={PageForList.status}
						/>
					)}
				</div>

				{/* ─ row-2: タグリスト ─ */}
				<PageTagList tag={PageForList.tagPages.map((t) => t.tag)} />

				{/* ─ row-3: ユーザ情報 + ボタン ─ */}
				<div className="flex items-center gap-2">
					<Link className="flex items-center gap-1 min-w-0" href={userLink}>
						<Avatar className="w-5 h-5 shrink-0">
							<AvatarImage {...props} />
							<AvatarFallback>
								{PageForList.user.handle.charAt(0).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<span className="text-xs text-gray-600 truncate">
							{PageForList.user.name}
						</span>
					</Link>
					<time className="text-xs text-muted-foreground whitespace-nowrap">
						{PageForList.createdAt.toLocaleDateString(locale)}
					</time>
				</div>

				{/* ③ アクション（いいね＋コメント） */}
				<div className="flex items-center gap-2 justify-end">
					<EyeIcon className="w-5 h-5" />
					<span className="text-muted-foreground">{viewCount}</span>
					<PageLikeButton pageId={PageForList.id} />
					<PageCommentButton
						commentCount={PageForList._count?.pageComments ?? 0}
						pageOwnerHandle={PageForList.user.handle}
						pageSlug={PageForList.slug}
						showCount
					/>
				</div>
			</div>
		</article>
	);
}

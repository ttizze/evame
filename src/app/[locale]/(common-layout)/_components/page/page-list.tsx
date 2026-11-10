import { EyeIcon } from "lucide-react";
import type { ReactNode } from "react";
import { PageTagList } from "@/app/[locale]/(common-layout)/_components/page/page-tag-list";
import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import type { PageForList } from "@/app/[locale]/types";
import { formatDate } from "../../_utils/format-date";
import { PageCommentButton } from "./page-list/page-comment-button";

type PageListProps = {
	PageForList: PageForList;
	likeButton: ReactNode;
	avatar: ReactNode;
	index: number | null;
	locale: string;
};

export function PageList({
	PageForList,
	likeButton,
	avatar,
	index,
	locale,
}: PageListProps) {
	const { titleSegment } = PageForList;
	return (
		<article
			className={`grid gap-4 py-4 border-b last:border-b-0 ${
				index !== null ? "grid-cols-[max-content_1fr]" : "grid-cols-1"
			}`}
		>
			{/* ───── 1) インデックス番号 ───── */}
			{index !== null && (
				<div className="text-lg font-medium text-muted-foreground self-start">
					{index + 1}
				</div>
			)}

			{/* ───── 2) コンテンツ領域 ───── */}
			{/**
			 * コンテンツ領域は 3 行の Grid:
			 *   row‑1: タイトル行
			 *   row‑2: タグ行
			 *   row‑3: フッター行（ユーザ & 日付 & ボタン）
			 */}
			<div className="grid grid-rows-[auto_auto_auto_auto] gap-1 min-w-0">
				{/* ─ row‑1: タイトル ─ */}
				<a
					className="block overflow-hidden"
					href={`/${locale}/${PageForList.userHandle}/${PageForList.slug}`}
				>
					<SegmentElement
						className="line-clamp-1 break-all overflow-wrap-anywhere"
						interactive={false}
						segment={titleSegment}
						tagName="span"
					/>
				</a>

				{/* ─ row-2: タグリスト ─ */}
				<PageTagList locale={locale} tag={PageForList.tags} />

				{/* ─ row-3: ユーザ情報 + ボタン ─ */}
				<div className="flex items-center gap-2">
					<a
						className="flex items-center gap-1 min-w-0"
						href={`/${locale}/${PageForList.userHandle}`}
					>
						{avatar}
						<span className="text-xs text-gray-600 truncate">
							{PageForList.userName}
						</span>
					</a>
					<time className="text-xs text-muted-foreground whitespace-nowrap">
						{formatDate(PageForList.createdAt, locale)}
					</time>
				</div>

				{/* ③ アクション（いいね＋コメント） */}
				<div className="flex items-center justify-end gap-2">
					<EyeIcon className="h-5 w-5" />
					<span className="text-muted-foreground">{PageForList.viewCount}</span>
					{likeButton}
					<PageCommentButton
						commentCount={PageForList.pageCommentsCount}
						locale={locale}
						pageOwnerHandle={PageForList.userHandle}
						pageSlug={PageForList.slug}
					/>
				</div>
			</div>
		</article>
	);
}

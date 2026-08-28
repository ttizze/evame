import { Link } from "@tanstack/react-router";
import { EyeIcon } from "lucide-react";
import { BASE_URL } from "@/app/_constants/base-url";
import { PageLikeButtonClient } from "@/app/[locale]/(common-layout)/_components/page/page-like-button/client";
import { PageTagList } from "@/app/[locale]/(common-layout)/_components/page/page-tag-list";
import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import type { PageForList } from "@/app/[locale]/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type PageListProps = {
	PageForList: PageForList;
	index?: number;
	locale: string;
};

export function PageList({ PageForList, index, locale }: PageListProps) {
	const { titleSegment } = PageForList;
	const _ogpImageUrl =
		`${BASE_URL}/api/og?locale=${locale}` + `&slug=${PageForList.slug}`;
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
			 *   row‑1: タイトル行
			 *   row‑2: タグ行
			 *   row‑3: フッター行（ユーザ & 日付 & ボタン）
			 */}
			<div className="grid grid-rows-[auto_auto_auto_auto] gap-1 min-w-0">
				{/* ─ row‑1: タイトル ─ */}
				<div>
					<Link
						className="block overflow-hidden"
						params={{
							handle: PageForList.userHandle,
							locale,
							pageSlug: PageForList.slug,
						}}
						to="/$locale/$handle/$pageSlug"
					>
						<SegmentElement
							className="line-clamp-1 break-all overflow-wrap-anywhere"
							interactive={false}
							segment={titleSegment}
							tagName="span"
						/>
					</Link>
				</div>

				{/* ─ row-2: タグリスト ─ */}
				<PageTagList tag={PageForList.tags} />

				{/* ─ row-3: ユーザ情報 + ボタン ─ */}
				<div className="flex items-center gap-2">
					<Link
						className="flex items-center gap-1 min-w-0"
						params={{ handle: PageForList.userHandle, locale }}
						to="/$locale/$handle"
					>
						<Avatar className="w-5 h-5 shrink-0">
							<AvatarImage alt="" src={PageForList.userImage} />
							<AvatarFallback>
								{PageForList.userHandle.charAt(0).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<span className="text-xs text-gray-600 truncate">
							{PageForList.userName}
						</span>
					</Link>
					<time className="text-xs text-muted-foreground whitespace-nowrap">
						{PageForList.createdAt.toLocaleDateString(locale)}
					</time>
				</div>

				{/* ③ アクション（いいね） */}
				<div className="flex items-center gap-2 justify-end">
					<EyeIcon className="w-5 h-5" />
					<span className="text-muted-foreground">{PageForList.viewCount}</span>
					<PageLikeButtonClient
						initialLikeCount={PageForList.likeCount}
						pageId={PageForList.id}
					/>
				</div>
			</div>
		</article>
	);
}

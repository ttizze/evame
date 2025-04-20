import { ClientDateFormatter } from "@/app/[locale]/_components/client-date-formatter";
import type { ProjectSummary } from "@/app/[locale]/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@/i18n/routing";
import Image, { getImageProps } from "next/image";
import { SegmentAndTranslationSection } from "../segment-and-translation-section/client";
import { ProjectActionsDropdown } from "./project-actions-dropdown/client";
import { ProjectLikeButton } from "./project-like-button/server";
import { ProjectTagList } from "./project-tag-list.server";

interface ProjectListProps {
	projectSummary: ProjectSummary;
	projectLink: string;
	userLink: string;
	showOwnerActions?: boolean;
	index?: number;
	currentUserHandle?: string;
}

export async function ProjectList({
	projectSummary,
	projectLink,
	userLink,
	showOwnerActions = false,
	index,
	currentUserHandle,
}: ProjectListProps) {
	/* ── 事前計算 ───────────────────────── */
	const { props: avatarProps } = getImageProps({
		src: projectSummary.user.image,
		alt: "",
		width: 40,
		height: 40,
	});

	const tagLineSegment = projectSummary.segmentBundles.find(
		(s) => s.segment.number === 0,
	);

	/* ── レイアウト ──────────────────────── */
	return (
		<article
			className={`grid gap-4 py-4 border-b last:border-b-0 ${
				index !== undefined
					? "grid-cols-[max-content_96px_1fr]"
					: "grid-cols-[96px_1fr]"
			}`}
		>
			{/* ─ 1) インデックス番号 ─ */}
			{index !== undefined && (
				<div className="text-lg font-medium text-muted-foreground self-start">
					{index + 1}
				</div>
			)}

			{/* ─ 2) アイコン画像 ─ */}
			<Link
				href={projectLink}
				className="relative h-16 w-24 overflow-hidden rounded"
			>
				{projectSummary.iconImage ? (
					<Image
						src={projectSummary.iconImage.url}
						alt={projectSummary.title}
						fill
						className="object-contain"
						sizes="96px"
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center bg-muted text-2xl font-semibold text-muted-foreground">
						{projectSummary.title.charAt(0).toUpperCase()}
					</div>
				)}
			</Link>

			{/* ─ 3) 本文：5 行 Grid ─ */}
			<div className="grid grid-rows-[auto_auto_auto_auto_auto] gap-1 min-w-0">
				{/* row‑1: タイトル & オーナー操作 */}
				<header className="grid grid-cols-[1fr_auto] gap-2 items-start">
					<Link href={projectLink} className="block overflow-hidden">
						<h3 className="font-medium break-all overflow-wrap-anywhere line-clamp-1">
							{projectSummary.title}
						</h3>
					</Link>

					{showOwnerActions && (
						<ProjectActionsDropdown
							projectId={projectSummary.id}
							projectOwnerHandle={projectSummary.user.handle}
						/>
					)}
				</header>

				{/* row‑2: タグライン（最初のセグメント） */}
				{tagLineSegment && (
					<SegmentAndTranslationSection
						segmentBundle={tagLineSegment}
						currentHandle={currentUserHandle}
						segmentTextClassName="text-sm line-clamp-1 break-all overflow-wrap-anywhere"
						interactive={false}
					/>
				)}

				{/* row‑3: タグ一覧 */}
				<ProjectTagList
					projectTag={projectSummary.projectTagRelations.map(
						(r) => r.projectTag,
					)}
				/>

				{/* row‑4: ユーザ情報 */}
				<div className="flex items-center gap-2">
					<Link href={userLink} className="flex items-center gap-1 min-w-0">
						<Avatar className="w-5 h-5 flex-shrink-0">
							<AvatarImage {...avatarProps} />
							<AvatarFallback>
								{projectSummary.user.handle.charAt(0).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<span className="text-xs text-gray-600 truncate">
							{projectSummary.user.name}
						</span>
					</Link>

					<time
						className="text-xs text-muted-foreground whitespace-nowrap"
						dateTime={projectSummary.createdAt}
					>
						<ClientDateFormatter date={new Date(projectSummary.createdAt)} />
					</time>
				</div>

				{/* row‑5: いいねボタン（右端固定） */}
				<div className="flex justify-end">
					<ProjectLikeButton projectId={projectSummary.id} showCount />
				</div>
			</div>
		</article>
	);
}

import {
	ADD_TRANSLATION_FORM_TARGET,
	VOTE_TARGET,
} from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import { ClientDateFormatter } from "@/app/[locale]/_components/client-date-formatter";
import { PageCommentButton } from "@/app/[locale]/_components/page/page-comment-button/client";
import { PageLikeButton } from "@/app/[locale]/_components/page/page-like-button/server";
import { PageTagList } from "@/app/[locale]/_components/page/page-tag-list";
import { SegmentAndTranslationSection } from "@/app/[locale]/_components/segment-and-translation-section/client";
import type { PagesWithRelations } from "@/app/[locale]/_db/queries.server";
import { BASE_URL } from "@/app/_constants/base-url";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@/i18n/routing";
import { getImageProps } from "next/image";
import Image from "next/image";
import { PageActionsDropdown } from "./page-actions-dropdown/client";

type PageListProps = {
	pageWithRelations: PagesWithRelations;
	pageLink: string;
	userLink: string;
	showOwnerActions?: boolean;
	index?: number;
	locale: string;
	currentUserHandle?: string;
};

export function PageList({
	pageWithRelations,
	pageLink,
	userLink,
	showOwnerActions = false,
	index,
	locale,
	currentUserHandle,
}: PageListProps) {
	const { props } = getImageProps({
		src: pageWithRelations.user.image,
		alt: "",
		width: 40,
		height: 40,
	});

	// Get the title segment (which should be the first segment)
	const titleSegment = pageWithRelations.segmentWithTranslations.find(
		(segment) => segment.number === 0,
	);

	const ogpImageUrl = `${BASE_URL}/api/og?locale=${locale}&slug=${pageWithRelations.slug}&showOriginal=${true}&showTranslation=${true}`;
	return (
		<div className="flex py-4 justify-between border-b last:border-b-0">
			{index !== undefined && (
				<div className="flex items-start justify-center w-6 text-lg font-medium text-muted-foreground mr-2">
					{index + 1}
				</div>
			)}

			<div className="flex gap-4 w-full">
				<div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded">
					<Link href={pageLink} className="block h-full w-full">
						<Image
							src={ogpImageUrl}
							alt={titleSegment?.text || ""}
							fill
							className="object-cover"
							sizes="96px"
						/>
					</Link>
				</div>

				<div className="min-w-0 flex-1">
					<div className="flex justify-between items-start">
						<Link href={pageLink} className="block">
							{titleSegment && (
								<div className="font-medium break-all overflow-wrap-anywhere">
									<SegmentAndTranslationSection
										segmentWithTranslations={titleSegment}
										currentHandle={currentUserHandle}
										voteTarget={VOTE_TARGET.PAGE_SEGMENT_TRANSLATION}
										addTranslationFormTarget={
											ADD_TRANSLATION_FORM_TARGET.PAGE_SEGMENT_TRANSLATION
										}
										slug={pageWithRelations.slug}
										isOwner={false}
										segmentTextClassName="line-clamp-1"
									/>
								</div>
							)}
						</Link>

						{showOwnerActions && (
							<PageActionsDropdown
								editPath={`${pageLink}/edit`}
								pageId={pageWithRelations.id}
								status={pageWithRelations.status}
							/>
						)}
					</div>
					<PageTagList
						tag={pageWithRelations.tagPages.map((tagPage) => tagPage.tag)}
					/>

					<div className="flex justify-between items-center mt-2">
						<div className="flex items-center">
							<Link href={userLink} className="flex items-center">
								<Avatar className="w-5 h-5 mr-1">
									<AvatarImage {...props} />
									<AvatarFallback>
										{pageWithRelations.user.handle.charAt(0).toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<span className="text-xs text-gray-600">
									{pageWithRelations.user.name}
								</span>
							</Link>
							<p className="text-xs text-muted-foreground ml-2">
								<ClientDateFormatter
									date={new Date(pageWithRelations.createdAt)}
								/>
							</p>
						</div>

						<div className="flex items-center gap-2">
							<PageLikeButton pageId={pageWithRelations.id} showCount />
							<PageCommentButton
								commentCount={pageWithRelations._count?.pageComments || 0}
								slug={pageWithRelations.slug}
								userHandle={pageWithRelations.user.handle}
								showCount
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

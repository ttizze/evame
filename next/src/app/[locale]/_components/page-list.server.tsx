import type { PageWithRelationsType } from "@/app/[locale]/_db/queries.server";
import { BASE_URL } from "@/app/_constants/base-url";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { getImageProps } from "next/image";
import Image from "next/image";
import { ClientDateFormatter } from "./client-date-formatter";
import { LikeButton } from "./like-button/client";
import { PageActionsDropdown } from "./page-actions-dropdown/client";
import { TagList } from "./tag-list";
type PageListProps = {
	pageWithRelations: PageWithRelationsType;
	pageLink: string;
	userLink: string;
	showOwnerActions?: boolean;
	index?: number;
};

export function PageList({
	pageWithRelations,
	pageLink,
	userLink,
	showOwnerActions = false,
	index,
}: PageListProps) {
	const { props } = getImageProps({
		src: pageWithRelations.user.image,
		alt: "",
		width: 40,
		height: 40,
	});
	const locale = useLocale();
	const title = pageWithRelations.pageSegments[0].text;
	const bestTranslationTitle =
		pageWithRelations.pageSegments[0].pageSegmentTranslations[0]?.text;

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
							alt={title}
							fill
							className="object-cover"
							sizes="96px"
						/>
					</Link>
				</div>

				<div className="min-w-0 flex-1">
					<div className="flex justify-between items-start">
						<Link href={pageLink} className="block">
							<h3 className="font-medium break-all overflow-wrap-anywhere line-clamp-1">
								{title}
							</h3>
							{bestTranslationTitle && (
								<p className="text-sm text-gray-600 line-clamp-1">
									{bestTranslationTitle}
								</p>
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
					<TagList
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
								<ClientDateFormatter date={pageWithRelations.createdAt} />
							</p>
						</div>

						<div className="flex items-center gap-2">
							<LikeButton
								liked={pageWithRelations.likePages.length > 0}
								likeCount={pageWithRelations._count.likePages}
								slug={pageWithRelations.slug}
								showCount
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

import type { PageCardLocalizedType } from "@/app/[locale]/_db/queries.server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import { getImageProps } from "next/image";
import { LikeButton } from "./like-button/client";
import { PageActionsDropdown } from "./page-actions-dropdown/client";
import { TagList } from "./tag-list";

type PageCardProps = {
	pageCard: PageCardLocalizedType;
	pageLink: string;
	userLink: string;
	showOwnerActions?: boolean;
};

export function PageCard({
	pageCard,
	pageLink,
	userLink,
	showOwnerActions = false,
}: PageCardProps) {
	const { props } = getImageProps({
		src: pageCard.user.image,
		alt: "",
		width: 40,
		height: 40,
	});
	const title = pageCard.pageSegments[0].text;
	const bestTranslationTitle =
		pageCard.pageSegments[0].pageSegmentTranslations[0]?.text;
	return (
		<Card className="h-full relative w-full overflow-hidden">
			{showOwnerActions && (
				<div className="absolute top-2 right-2">
					<PageActionsDropdown
						editPath={`${pageLink}/edit`}
						pageId={pageCard.id}
						status={pageCard.status}
					/>
				</div>
			)}
			<CardHeader>
				<Link href={pageLink} className="block">
					<CardTitle className="flex flex-col pr-3 break-all overflow-wrap-anywhere">
						{title}
						{bestTranslationTitle && (
							<span className="text-sm text-gray-600">
								{bestTranslationTitle}
							</span>
						)}
					</CardTitle>
					<CardDescription>{pageCard.createdAt}</CardDescription>
				</Link>
				<TagList tag={pageCard.tagPages.map((tagPage) => tagPage.tag)} />
			</CardHeader>
			<CardContent>
				<div className="flex justify-between items-center">
					<Link href={userLink} className="flex items-center">
						<Avatar className="w-6 h-6 mr-2">
							<AvatarImage {...props} />
							<AvatarFallback>
								{pageCard.user.handle.charAt(0).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<span className="text-sm text-gray-600">{pageCard.user.name}</span>
					</Link>

					<LikeButton
						liked={pageCard.likePages.length > 0}
						likeCount={pageCard._count.likePages}
						slug={pageCard.slug}
						showCount
					/>
				</div>
			</CardContent>
		</Card>
	);
}

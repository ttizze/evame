import type { PageCardLocalizedType } from "@/app/[locale]/db/queries.server";
import { NavigationLink } from "@/components/navigation-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { LikeButton } from "./like-button/like-button";
import { PageActionsDropdown } from "./page-actions-dropdown/page-actions-dropdown";
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
				<NavigationLink href={pageLink} className="block">
					<CardTitle className="flex flex-col pr-3 break-all overflow-wrap-anywhere">
						{pageCard.pageSegments[0].text}
						{pageCard.pageSegments[0].pageSegmentTranslations.length > 0 && (
							<span className="text-sm text-gray-600">
								{pageCard.pageSegments[0].pageSegmentTranslations[0].text}
							</span>
						)}
					</CardTitle>
					<CardDescription>{pageCard.createdAt}</CardDescription>
				</NavigationLink>
				<TagList tag={pageCard.tagPages.map((tagPage) => tagPage.tag)} />
			</CardHeader>
			<CardContent>
				<div className="flex justify-between items-center">
					<NavigationLink href={userLink} className="flex items-center">
						<Avatar className="w-6 h-6 mr-2">
							<AvatarImage src={pageCard.user.image} alt={pageCard.user.name} />
							<AvatarFallback>
								{pageCard.user.handle.charAt(0).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<span className="text-sm text-gray-600">{pageCard.user.name}</span>
					</NavigationLink>

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

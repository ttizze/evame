import { LocaleLink } from "~/components/LocaleLink";
import { TagList } from "~/components/TagList";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import type { PageCardLocalizedType } from "~/routes/$locale+/functions/queries.server";
import { PageActionsDropdown } from "~/routes/$locale+/user.$handle+/components/PageActionsDropdown";
import { LikeButton } from "~/routes/resources+/like-button";

type PageCardProps = {
	pageCard: PageCardLocalizedType;
	pageLink: string;
	userLink: string;
	showOwnerActions?: boolean;
	onTogglePublicStatus?: (pageId: number) => void;
	onArchive?: (pageId: number) => void;
};

export function PageCard({
	pageCard,
	pageLink,
	userLink,
	showOwnerActions = false,
	onTogglePublicStatus,
	onArchive,
}: PageCardProps) {
	return (
		<Card className="h-full relative w-full overflow-hidden">
			{showOwnerActions && onTogglePublicStatus && onArchive && (
				<div className="absolute top-2 right-2">
					<PageActionsDropdown
						editPath={`${pageLink}/edit`}
						onTogglePublic={() => onTogglePublicStatus(pageCard.id)}
						onDelete={() => onArchive(pageCard.id)}
						status={pageCard.status}
					/>
				</div>
			)}
			<CardHeader>
				<LocaleLink to={pageLink} className="block">
					<CardTitle className="flex flex-col pr-3 break-all overflow-wrap-anywhere">
						{pageCard.sourceTexts[0].text}
						{pageCard.sourceTexts[0].translateTexts.length > 0 && (
							<span className="text-sm text-gray-600">
								{pageCard.sourceTexts[0].translateTexts[0].text}
							</span>
						)}
					</CardTitle>
					<CardDescription>{pageCard.createdAt}</CardDescription>
				</LocaleLink>
				<TagList tag={pageCard.tagPages.map((tagPage) => tagPage.tag)} />
			</CardHeader>
			<CardContent>
				<div className="flex justify-between items-center">
					<LocaleLink to={userLink} className="flex items-center">
						<Avatar className="w-6 h-6 mr-2">
							<AvatarImage src={pageCard.user.icon} alt={pageCard.user.name} />
							<AvatarFallback>
								{pageCard.user.handle.charAt(0).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<span className="text-sm text-gray-600">{pageCard.user.name}</span>
					</LocaleLink>

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

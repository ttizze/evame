// PageCard.tsx
import { Link } from "@remix-run/react";
import { Lock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { PageActionsDropdown } from "~/routes/$userName+/components/PageActionsDropdown";
import { LikeButton } from "~/routes/resources+/like-button";
import type { PageCardType } from "~/routes/types";

type PageCardProps = {
	pageCard: PageCardType;
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
						isPublished={pageCard.isPublished}
					/>
				</div>
			)}
			<CardHeader>
				<Link to={pageLink} className="block">
					<CardTitle className="flex items-center pr-3 break-all overflow-wrap-anywhere">
						{!pageCard.isPublished && <Lock className="h-4 w-4 mr-2" />}
						{pageCard.title}
					</CardTitle>
					<CardDescription>{pageCard.createdAt}</CardDescription>
				</Link>
			</CardHeader>
			<CardContent>
				<div className="flex justify-between items-center">
					<Link to={userLink} className="flex items-center">
						<Avatar className="w-6 h-6 mr-2">
							<AvatarImage
								src={pageCard.user.icon}
								alt={pageCard.user.displayName}
							/>
							<AvatarFallback>
								{pageCard.user.displayName.charAt(0).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<span className="text-sm text-gray-600">
							{pageCard.user.displayName}
						</span>
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

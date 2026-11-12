import type { ReactNode } from "react";
import { useTranslations } from "use-intl";
import type { NotificationRowsWithRelations } from "@/app/api/notifications/_types/notification";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function NotificationsList({
	locale,
	notifications,
}: {
	locale: string;
	notifications: NotificationRowsWithRelations[];
}) {
	const t = useTranslations("Header");
	if (notifications.length === 0)
		return (
			<DropdownMenuItem className="px-4 py-3" disabled>
				{t("notificationsEmpty")}
			</DropdownMenuItem>
		);
	return notifications.map(
		(
			{
				id,
				actorHandle,
				actorName,
				actorImage,
				type,
				read,
				createdAt,
				pageSlug,
				pageOwnerHandle,
				pageTitle,
				segmentTranslationText,
			},
			index,
		) => {
			const actorHref = `/${locale}/${actorHandle}`;
			const pageHref = `/${locale}/${pageOwnerHandle}/${pageSlug}`;
			const pageLink =
				pageSlug && pageOwnerHandle && pageTitle ? (
					<a
						className="hover:underline font-bold"
						href={pageHref}
						onClick={(event) => event.stopPropagation()}
					>
						{pageTitle}
					</a>
				) : null;
			let actionText: ReactNode;
			let extraContent: ReactNode = null;
			switch (type) {
				case "PAGE_LIKE":
				case "PAGE_COMMENT":
					if (!pageLink) return null;
					actionText = t(
						type === "PAGE_LIKE"
							? "notificationLiked"
							: "notificationCommented",
					);
					extraContent = pageLink;
					break;
				case "FOLLOW":
					actionText = t("notificationFollowed");
					break;
				case "PAGE_SEGMENT_TRANSLATION_VOTE":
				case "PAGE_COMMENT_SEGMENT_TRANSLATION_VOTE":
					if (!segmentTranslationText || !pageLink) return null;
					actionText = t("notificationVoted");
					extraContent = (
						<>
							{segmentTranslationText}
							<span className="text-muted-foreground">
								{" "}
								{t("notificationOn")}{" "}
							</span>
							{pageLink}
						</>
					);
					break;
			}
			return (
				<DropdownMenuItem
					className={`flex items-center p-4 border-t rounded-none ${!read ? "bg-muted" : ""} ${index === 0 ? "border-none" : ""}`}
					key={id}
					onSelect={() =>
						window.location.assign(type === "FOLLOW" ? actorHref : pageHref)
					}
				>
					<a
						className="flex items-center mr-2 no-underline! hover:text-gray-700"
						href={actorHref}
						onClick={(event) => event.stopPropagation()}
					>
						<Avatar className="w-10 h-10 shrink-0 mr-3">
							<AvatarImage
								alt={actorName || ""}
								height={40}
								src={actorImage || ""}
								width={40}
							/>
							<AvatarFallback>
								{(actorName || actorHandle).charAt(0).toUpperCase()}
							</AvatarFallback>
						</Avatar>
					</a>
					<span className="flex min-w-0 flex-col break-words">
						<span>
							<a
								className="hover:underline font-bold"
								href={actorHref}
								onClick={(event) => event.stopPropagation()}
							>
								{actorName}
							</a>
							<span className="text-muted-foreground"> {actionText} </span>
							{extraContent}
						</span>
						<time
							className="text-muted-foreground text-sm"
							dateTime={new Date(createdAt).toISOString()}
						>
							{new Date(createdAt).toLocaleString(locale, {
								timeZone: "UTC",
								timeZoneName: "short",
							})}
						</time>
					</span>
				</DropdownMenuItem>
			);
		},
	);
}

"use client";

import { Bell } from "lucide-react";
import { getImageProps } from "next/image";
import { startTransition, useActionState } from "react";
import type { ActionResponse } from "@/app/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/routing";
import { markNotificationAsReadAction } from "./action";
import type { NotificationWithRelations } from "./db/queries.server";

export function NotificationsDropdownClient({
	notifications,
	currentUserHandle,
}: {
	notifications: NotificationWithRelations[];
	currentUserHandle: string;
}) {
	const [_markNotificationAsReadResponse, action, _isPending] = useActionState<
		ActionResponse,
		FormData
	>(markNotificationAsReadAction, { success: false });
	const handleClick = (open: boolean) => {
		if (open) {
			startTransition(() => {
				action(new FormData());
			});
		}
	};
	const unreadCount = notifications.filter(
		(notification) => !notification.read,
	).length;
	return (
		<DropdownMenu
			data-testid="notifications-menu"
			onOpenChange={handleClick}
			modal={false}
		>
			<DropdownMenuTrigger asChild>
				<div className="relative">
					<Bell data-testid="bell-icon" className="w-6 h-6 cursor-pointer" />
					{unreadCount > 0 && (
						<span
							data-testid="unread-count"
							className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
						>
							{unreadCount}
						</span>
					)}
				</div>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="w-80 overflow-y-scroll h-96 p-0 rounded-xl"
				data-testid="notifications-menu-content"
			>
				{notifications.length === 0 ? (
					<DropdownMenuItem className="cursor-default">
						No notifications
					</DropdownMenuItem>
				) : (
					notifications.map((notification, index) => (
						<NotificationItem
							key={notification.id}
							notificationWithRelations={notification}
							currentUserHandle={currentUserHandle}
							index={index}
						/>
					))
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function NotificationItem({
	notificationWithRelations,
	currentUserHandle,
	index,
}: {
	notificationWithRelations: NotificationWithRelations;
	currentUserHandle: string;
	index: number;
}) {
	return (
		<DropdownMenuItem
			className={`flex items-center p-4 border-t rounded-none ${
				!notificationWithRelations.read ? "bg-muted" : ""
			} ${index === 0 ? "border-none" : ""}`}
		>
			<NotificationContent
				notificationWithRelations={notificationWithRelations}
				currentUserHandle={currentUserHandle}
			/>
		</DropdownMenuItem>
	);
}
function NotificationContent({
	notificationWithRelations,
	currentUserHandle,
}: {
	notificationWithRelations: NotificationWithRelations;
	currentUserHandle: string;
}) {
	const { actor, type } = notificationWithRelations;
	const commonLink = (
		<Link href={`/user/${actor.handle}`} className="hover:underline font-bold">
			{actor.name}
		</Link>
	);
	const commonDate = notificationWithRelations.createdAt.toLocaleString();

	let actionText: React.ReactNode = null;
	let extraContent: React.ReactNode = null;

	switch (type) {
		case "PAGE_COMMENT": {
			const { pageComment } = notificationWithRelations;
			const title = pageComment?.page.pageSegments[0].text;
			if (!title) return null;
			actionText = <span className="text-gray-500"> commented on </span>;
			extraContent = (
				<Link
					href={`/user/${currentUserHandle}/page/${pageComment?.page.slug}`}
					className="hover:underline font-bold"
				>
					{title}
				</Link>
			);
			break;
		}
		case "PAGE_LIKE": {
			const { page } = notificationWithRelations;
			const title = page?.pageSegments[0].text;
			if (!title) return null;
			actionText = <span className="text-gray-500"> liked your page </span>;
			extraContent = (
				<Link
					href={`/user/${currentUserHandle}/page/${page?.slug}`}
					className="hover:underline font-bold"
				>
					{title}
				</Link>
			);
			break;
		}
		case "FOLLOW": {
			actionText = <span className="text-gray-500"> followed you</span>;
			break;
		}
		case "PAGE_SEGMENT_TRANSLATION_VOTE": {
			const votedText = notificationWithRelations.pageSegmentTranslation?.text;
			const votedPage =
				notificationWithRelations.pageSegmentTranslation?.pageSegment.page;
			const votedPageTitle = votedPage?.pageSegments[0].text;
			const votedPageUser = votedPage?.user;
			actionText = <span className="text-gray-500"> voted for </span>;
			extraContent = (
				<>
					<span className="">{votedText}</span>
					<span className="text-gray-500"> on </span>
					<Link
						href={`/user/${votedPageUser?.handle}/page/${votedPage?.slug}`}
						className="hover:underline font-bold"
					>
						{votedPageTitle}
					</Link>
				</>
			);
			break;
		}

		default:
			return <span>通知</span>;
	}

	return (
		<>
			<NotificationAvatar actor={actor} />
			<span className="flex flex-col">
				<span>
					{commonLink}
					{actionText}
					{extraContent}
				</span>
				<span className="text-gray-500 text-sm">{commonDate}</span>
			</span>
		</>
	);
}

function NotificationAvatar({
	actor,
}: {
	actor: { handle: string; image: string; name: string };
}) {
	const { props } = getImageProps({
		src: actor.image,
		alt: actor.name,
		width: 40,
		height: 40,
	});
	return (
		<Link
			href={`/user/${actor.handle}`}
			className="flex items-center mr-2 no-underline! hover:text-gray-700"
		>
			<Avatar className="w-10 h-10 shrink-0 mr-3">
				<AvatarImage {...props} />
				<AvatarFallback>{actor.name.charAt(0).toUpperCase()}</AvatarFallback>
			</Avatar>
		</Link>
	);
}

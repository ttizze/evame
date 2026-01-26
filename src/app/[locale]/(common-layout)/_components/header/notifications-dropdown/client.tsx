"use client";

import { Bell, Loader2 } from "lucide-react";
import { getImageProps } from "next/image";
import { startTransition, useActionState } from "react";
import useSWR from "swr";
import type { NotificationRowsWithRelations } from "@/app/api/notifications/_types/notification";
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
export function NotificationsDropdownClient({
	currentUserHandle,
}: {
	currentUserHandle: string;
}) {
	const [_markNotificationAsReadResponse, action, _isPending] = useActionState<
		ActionResponse,
		FormData
	>(markNotificationAsReadAction, { success: false });
	const { data, isLoading, mutate } = useSWR<{
		notifications: NotificationRowsWithRelations[];
	}>(
		"/api/notifications",
		(url) => fetch(url, { credentials: "include" }).then((r) => r.json()),
		{ revalidateOnFocus: true },
	);

	if (isLoading) return <Loader2 className="w-6 h-6 animate-spin" />;

	const handleClick = (open: boolean) => {
		if (open) {
			startTransition(() => {
				action(new FormData());
			});
			mutate(
				(prev) => {
					if (!prev) return prev;
					return {
						notifications: prev.notifications.map((n) => ({
							...n,
							read: true,
						})),
					};
				},
				{ revalidate: false },
			);
		}
	};
	const unreadCount =
		data?.notifications?.filter(
			(notificationRowsWithRelations) => !notificationRowsWithRelations.read,
		).length ?? 0;
	return (
		<DropdownMenu
			data-testid="notifications-menu"
			modal={false}
			onOpenChange={handleClick}
		>
			<DropdownMenuTrigger asChild>
				<div className="relative">
					<Bell className="w-6 h-6 cursor-pointer" data-testid="bell-icon" />
					{unreadCount
						? unreadCount > 0 && (
								<span
									className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
									data-testid="unread-count"
								>
									{unreadCount}
								</span>
							)
						: null}
				</div>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="w-80 overflow-y-scroll h-96 p-0 rounded-xl"
				data-testid="notifications-menu-content"
			>
				{!data?.notifications || data.notifications.length === 0 ? (
					<DropdownMenuItem className="cursor-default">
						No notifications
					</DropdownMenuItem>
				) : (
					data.notifications.map(
						(
							notificationRowWithRelations: NotificationRowsWithRelations,
							index: number,
						) => (
							<NotificationItem
								currentUserHandle={currentUserHandle}
								index={index}
								key={notificationRowWithRelations.id}
								notificationRowsWithRelations={notificationRowWithRelations}
							/>
						),
					)
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function NotificationItem({
	notificationRowsWithRelations,
	currentUserHandle,
	index,
}: {
	notificationRowsWithRelations: NotificationRowsWithRelations;
	currentUserHandle: string;
	index: number;
}) {
	return (
		<DropdownMenuItem
			className={`flex items-center p-4 border-t rounded-none ${
				!notificationRowsWithRelations.read ? "bg-muted" : ""
			} ${index === 0 ? "border-none" : ""}`}
		>
			<NotificationContent
				currentUserHandle={currentUserHandle}
				notificationRowsWithRelations={notificationRowsWithRelations}
			/>
		</DropdownMenuItem>
	);
}
function NotificationContent({
	notificationRowsWithRelations,
}: {
	notificationRowsWithRelations: NotificationRowsWithRelations;
	currentUserHandle: string;
}) {
	const { actorHandle, actorName, actorImage, type } =
		notificationRowsWithRelations;
	const commonLink = (
		<Link className="hover:underline font-bold" href={`/${actorHandle}`}>
			{actorName}
		</Link>
	);
	const commonDate = notificationRowsWithRelations.createdAt.toLocaleString();

	// ページ情報を取得してリンクを生成する共通関数
	const getPageLink = () => {
		const pageTitle = notificationRowsWithRelations.pageTitle;
		const pageSlug = notificationRowsWithRelations.pageSlug;
		const pageOwnerHandle = notificationRowsWithRelations.pageOwnerHandle;
		if (!pageTitle || !pageSlug || !pageOwnerHandle) return null;
		return (
			<Link
				className="hover:underline font-bold"
				href={`/${pageOwnerHandle}/${pageSlug}`}
			>
				{pageTitle}
			</Link>
		);
	};

	let actionText: React.ReactNode = null;
	let extraContent: React.ReactNode = null;

	switch (type) {
		case "PAGE_COMMENT": {
			actionText = <span className="text-gray-500"> commented on </span>;
			extraContent = getPageLink();
			if (!extraContent) return null;
			break;
		}
		case "PAGE_LIKE": {
			actionText = <span className="text-gray-500"> liked your page </span>;
			extraContent = getPageLink();
			if (!extraContent) return null;
			break;
		}
		case "FOLLOW": {
			actionText = <span className="text-gray-500"> followed you</span>;
			break;
		}
		case "PAGE_SEGMENT_TRANSLATION_VOTE":
		case "PAGE_COMMENT_SEGMENT_TRANSLATION_VOTE": {
			const votedText = notificationRowsWithRelations.segmentTranslationText;
			const pageTitle = notificationRowsWithRelations.pageTitle;
			const pageSlug = notificationRowsWithRelations.pageSlug;
			const pageOwnerHandle = notificationRowsWithRelations.pageOwnerHandle;
			if (!votedText || !pageTitle || !pageSlug || !pageOwnerHandle)
				return null;
			actionText = <span className="text-gray-500"> voted for </span>;
			extraContent = (
				<>
					<span className="">{votedText}</span>
					<span className="text-gray-500"> on </span>
					<Link
						className="hover:underline font-bold"
						href={`/${pageOwnerHandle}/${pageSlug}`}
					>
						{pageTitle}
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
			<NotificationAvatar
				actorHandle={actorHandle}
				actorImage={actorImage}
				actorName={actorName}
			/>
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
	actorHandle,
	actorImage,
	actorName,
}: {
	actorHandle: string;
	actorImage: string;
	actorName: string;
}) {
	const { props } = getImageProps({
		src: actorImage || "",
		alt: actorName || "",
		width: 40,
		height: 40,
	});
	return (
		<Link
			className="flex items-center mr-2 no-underline! hover:text-gray-700"
			href={`/${actorHandle}`}
		>
			<Avatar className="w-10 h-10 shrink-0 mr-3">
				<AvatarImage {...props} />
				<AvatarFallback>
					{(actorName || actorHandle).charAt(0).toUpperCase()}
				</AvatarFallback>
			</Avatar>
		</Link>
	);
}

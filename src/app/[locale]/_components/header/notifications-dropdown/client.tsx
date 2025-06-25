'use client';

import { Bell } from 'lucide-react';
import { getImageProps } from 'next/image';
import { startTransition, useActionState } from 'react';
import type { ActionResponse } from '@/app/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link } from '@/i18n/routing';
import { markNotificationAsReadAction } from './action';
import type { NotificationWithRelations } from './db/queries.server';

export function NotificationsDropdownClient({
  notifications,
  currentUserHandle,
}: {
  notifications: NotificationWithRelations[];
  currentUserHandle: string;
}) {
  const [markNotificationAsReadResponse, action, isPending] = useActionState<
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
    (notification) => !notification.read
  ).length;
  return (
    <DropdownMenu
      data-testid="notifications-menu"
      modal={false}
      onOpenChange={handleClick}
    >
      <DropdownMenuTrigger asChild>
        <div className="relative">
          <Bell className="h-6 w-6 cursor-pointer" data-testid="bell-icon" />
          {unreadCount > 0 && (
            <span
              className="-translate-y-1/2 absolute top-0 right-0 flex h-5 w-5 translate-x-1/2 items-center justify-center rounded-full bg-red-500 font-bold text-white text-xs"
              data-testid="unread-count"
            >
              {unreadCount}
            </span>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="h-96 w-80 overflow-y-scroll rounded-xl p-0"
        data-testid="notifications-menu-content"
      >
        {notifications.length === 0 ? (
          <DropdownMenuItem className="cursor-default">
            No notifications
          </DropdownMenuItem>
        ) : (
          notifications.map((notification, index) => (
            <NotificationItem
              currentUserHandle={currentUserHandle}
              index={index}
              key={notification.id}
              notificationWithRelations={notification}
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
      className={`flex items-center rounded-none border-t p-4 ${
        notificationWithRelations.read ? '' : 'bg-muted'
      } ${index === 0 ? 'border-none' : ''}`}
    >
      <NotificationContent
        currentUserHandle={currentUserHandle}
        notificationWithRelations={notificationWithRelations}
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
    <Link className="font-bold hover:underline" href={`/user/${actor.handle}`}>
      {actor.name}
    </Link>
  );
  const commonDate = notificationWithRelations.createdAt.toLocaleString();

  let actionText: React.ReactNode = null;
  let extraContent: React.ReactNode = null;

  switch (type) {
    case 'PAGE_COMMENT': {
      const { pageComment } = notificationWithRelations;
      const title = pageComment?.page.pageSegments[0].text;
      if (!title) return null;
      actionText = <span className="text-gray-500"> commented on </span>;
      extraContent = (
        <Link
          className="font-bold hover:underline"
          href={`/user/${currentUserHandle}/page/${pageComment?.page.slug}`}
        >
          {title}
        </Link>
      );
      break;
    }
    case 'PAGE_LIKE': {
      const { page } = notificationWithRelations;
      const title = page?.pageSegments[0].text;
      if (!title) return null;
      actionText = <span className="text-gray-500"> liked your page </span>;
      extraContent = (
        <Link
          className="font-bold hover:underline"
          href={`/user/${currentUserHandle}/page/${page?.slug}`}
        >
          {title}
        </Link>
      );
      break;
    }
    case 'FOLLOW': {
      actionText = <span className="text-gray-500"> followed you</span>;
      break;
    }
    case 'PAGE_SEGMENT_TRANSLATION_VOTE': {
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
            className="font-bold hover:underline"
            href={`/user/${votedPageUser?.handle}/page/${votedPage?.slug}`}
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
      className="no-underline! mr-2 flex items-center hover:text-gray-700"
      href={`/user/${actor.handle}`}
    >
      <Avatar className="mr-3 h-10 w-10 shrink-0">
        <AvatarImage {...props} />
        <AvatarFallback>{actor.name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
    </Link>
  );
}

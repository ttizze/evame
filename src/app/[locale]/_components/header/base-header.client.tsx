'use client';
import { BookOpenIcon, LogOutIcon } from 'lucide-react';
import Image, { getImageProps } from 'next/image';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { signOutAction } from '@/app/[locale]/auth-action';
import type { SanitizedUser } from '@/app/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link } from '@/i18n/routing';
import { ModeToggle } from '../mode-toggle';
import { useHeaderScroll } from './hooks/use-header-scroll';
import { LocaleSelector } from './locale-selector/client';

interface BaseHeaderProps {
  currentUser: SanitizedUser | undefined;
  leftExtra?: ReactNode;
  rightExtra?: ReactNode;
  showUserMenu?: boolean;
  hasGeminiApiKey?: boolean;
}

export function BaseHeader({
  currentUser,
  leftExtra,
  rightExtra,
  showUserMenu = true,
  hasGeminiApiKey = false,
}: BaseHeaderProps) {
  // カスタムフックを使用
  const { headerRef, isPinned, isVisible, headerHeight } = useHeaderScroll();
  const { props } = getImageProps({
    src: currentUser?.image || '',
    alt: currentUser?.name || '',
    width: 40,
    height: 40,
  });
  const { pageSlug } = useParams<{
    pageSlug?: string;
  }>();
  return (
    <div ref={headerRef}>
      <header
        className={`z-50 rounded-b-3xl bg-background transition-all duration-300 ${
          isVisible ? 'translate-y-0' : '-translate-y-full'
        } ${
          isPinned
            ? 'fixed top-0 right-0 left-0 shadow-md dark:shadow-gray-900'
            : ''
        } mx-auto flex max-w-3xl items-center justify-between px-2 py-2 md:px-6 md:py-4 lg:px-8`}
      >
        <div className="flex items-center gap-4">
          <Link className="flex items-center" href="/">
            {currentUser ? (
              <Image
                alt="Evame"
                aria-label="Evame Logo"
                className="h-8 w-20 dark:invert"
                height={32}
                src="/logo.svg"
                width={80}
              />
            ) : (
              <>
                <Image
                  alt="Evame"
                  aria-label="Evame Logo"
                  className="h-8 w-8 md:hidden dark:invert"
                  height={32}
                  src="/favicon.svg"
                  width={32}
                />
                <Image
                  alt="Evame"
                  aria-label="Evame Logo"
                  className="hidden h-8 w-20 md:block dark:invert"
                  height={32}
                  src="/logo.svg"
                  width={80}
                />
              </>
            )}
          </Link>
          {leftExtra}
        </div>
        <div className="flex items-center gap-4">
          {rightExtra}
          {showUserMenu && currentUser && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger>
                <Avatar className="h-6 w-6">
                  <AvatarImage {...props} />
                  <AvatarFallback>
                    {currentUser.handle.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="m-2 min-w-40 rounded-xl p-0">
                <DropdownMenuItem className="p-0">
                  <Link
                    className="w-full cursor-pointer rounded-none px-4 py-3 opacity-100 hover:bg-accent hover:text-accent-foreground"
                    href={`/user/${currentUser.handle}`}
                  >
                    <div className="flex flex-col items-start">
                      {currentUser.name}
                      <span className="text-gray-500 text-xs">
                        @{currentUser.handle}
                      </span>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-0" />
                <LocaleSelector
                  currentHandle={currentUser.handle}
                  hasGeminiApiKey={hasGeminiApiKey}
                  localeSelectorClassName="w-[200px]"
                  pageSlug={pageSlug}
                />
                <DropdownMenuItem className="p-0 ">
                  <Link
                    className="flex w-full cursor-pointer items-center gap-2 rounded-none px-4 py-3 opacity-100 hover:bg-accent hover:text-accent-foreground"
                    href={`/user/${currentUser.handle}/page-management`}
                  >
                    <BookOpenIcon className="h-4 w-4" />
                    Page Management
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <ModeToggle />
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <button
                    className="flex w-full cursor-pointer items-center gap-2 rounded-none px-4 py-3 text-red-500 text-sm hover:bg-accent hover:text-accent-foreground"
                    onClick={signOutAction}
                    type="submit"
                  >
                    <LogOutIcon className="h-4 w-4" />
                    Log out
                  </button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>
      {isPinned && <div style={{ height: `${headerHeight}px` }} />}
    </div>
  );
}

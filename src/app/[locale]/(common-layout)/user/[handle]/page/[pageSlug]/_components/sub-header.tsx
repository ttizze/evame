'use client';
import { ChevronDown, List, PencilIcon } from 'lucide-react';
import { getImageProps } from 'next/image';
import { useState } from 'react';
import { ClientDateFormatter } from '@/app/[locale]/_components/client-date-formatter';
import { useHeaderScroll } from '@/app/[locale]/_components/header/hooks/use-header-scroll';
import type { PageDetail } from '@/app/[locale]/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import Toc, { useHasTableOfContents } from './toc';

export function SubHeader({
  pageDetail,
  currentUserHandle,
}: {
  pageDetail: PageDetail;
  currentUserHandle?: string;
}) {
  const [isTocOpen, setIsTocOpen] = useState(false);
  const hasTocContent = useHasTableOfContents();
  const isEditable = currentUserHandle === pageDetail.user.handle;

  // カスタムフックを使用 - SubHeaderの特殊な動作のため初期オフセットを考慮
  const { headerRef, isPinned, isVisible, headerHeight } = useHeaderScroll();

  const renderToc = () => {
    if (!hasTocContent) return null;

    return (
      <>
        <Button
          className={
            'relative flex items-center gap-1 self-end rounded-full bg-background'
          }
          onClick={() => setIsTocOpen(!isTocOpen)}
          title="Table of Contents"
          variant="ghost"
        >
          <List className="h-5 w-5" />
          <div
            className="transition-transform duration-300 ease-in-out"
            style={{ transform: isTocOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <ChevronDown className="h-4 w-4" />
          </div>
        </Button>

        {isTocOpen && (
          <div
            className={
              'zoom-in-95 absolute top-full right-0 z-50 mt-2 animate-in rounded-xl border border-border bg-background px-3 py-4 drop-shadow-xl duration-200 dark:drop-shadow-[0_9px_7px_rgba(255,255,255,0.1)]'
            }
          >
            <Toc onItemClick={() => setIsTocOpen(false)} />
          </div>
        )}
      </>
    );
  };
  const { props } = getImageProps({
    src: pageDetail.user.image,
    alt: pageDetail.user.name,
    width: 40,
    height: 40,
  });
  return (
    <div ref={headerRef}>
      <div
        className={`z-999 transition-all duration-300 ${
          isVisible ? '' : '-translate-y-full'
        }	${isPinned ? 'fixed top-0 right-0 left-0 shadow-md' : ''} bg-background py-4`}
      >
        <div
          className={`prose dark:prose-invert sm:prose lg:prose-lg not-prose relative mx-auto flex items-center justify-between ${isPinned ? 'px-4' : ''}`}
        >
          <Link
            className="no-underline! mr-2 flex items-center hover:text-gray-700"
            href={`/user/${pageDetail.user.handle}`}
          >
            <Avatar className="mr-3 h-10 w-10 shrink-0 ">
              <AvatarImage {...props} />
              <AvatarFallback>
                {pageDetail.user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm">{pageDetail.user.name}</span>
              {!isPinned && (
                <span className="text-gray-500 text-xs">
                  <ClientDateFormatter date={new Date(pageDetail.createdAt)} />
                </span>
              )}
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {isEditable && (
              <Link
                href={`/user/${currentUserHandle}/page/${pageDetail.slug}/edit`}
                prefetch={false}
              >
                <Button variant="ghost">
                  <PencilIcon className="h-4 w-4" />
                </Button>
              </Link>
            )}
            {renderToc()}
          </div>
        </div>
      </div>
      {isPinned && <div style={{ height: `${headerHeight}px` }} />}
    </div>
  );
}

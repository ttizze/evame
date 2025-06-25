'use client';
import { getImageProps } from 'next/image';
import type { ReactNode } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CommentListProps {
  authorName: string;
  authorImage?: string | null;
  createdAt: string;
  /** ケバブメニューなど右端に出すアクション */
  action?: ReactNode;
  /** markdown → React した本文 */
  content: ReactNode;
  /** 返信フォーム */
  replyForm?: ReactNode;
  /** 子コメント */
  children?: ReactNode;
}

export function CommentList({
  authorName,
  authorImage,
  createdAt,
  action,
  content,
  replyForm,
  children,
}: CommentListProps) {
  const { props } = getImageProps({
    src: authorImage ?? '',
    alt: authorName,
    width: 40,
    height: 40,
  });

  return (
    <div>
      {/* ── ヘッダー ─────────────────────────── */}
      <div className="flex items-center">
        <Avatar className="not-prose mr-3 h-6 w-6">
          <AvatarImage {...props} />
          <AvatarFallback>{authorName?.charAt(0) || '?'}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-sm">{authorName}</span>
              <span className="ml-2 text-muted-foreground text-sm">
                {createdAt.toLocaleString()}
              </span>
            </div>
            {action}
          </div>
        </div>
      </div>

      {/* ── 本文 ─────────────────────────────── */}
      <div className="prose dark:prose-invert mt-2">{content}</div>

      {/* ── 返信フォーム ─────────────────────── */}
      {replyForm}

      {/* ── 子コメント ───────────────────────── */}
      {children && <div className="border-l pt-2 pl-4">{children}</div>}
    </div>
  );
}

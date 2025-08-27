"use client";
import { getImageProps } from "next/image";
import type { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CommentListProps {
	authorName: string;
	authorImage?: string | null;
	createdAt: Date;
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
		src: authorImage ?? "",
		alt: authorName,
		width: 40,
		height: 40,
	});

	return (
		<div>
			{/* ── ヘッダー ─────────────────────────── */}
			<div className="flex items-center">
				<Avatar className="w-6 h-6 mr-3 not-prose">
					<AvatarImage {...props} />
					<AvatarFallback>{authorName?.charAt(0) || "?"}</AvatarFallback>
				</Avatar>
				<div className="flex-1">
					<div className="flex items-center justify-between">
						<div>
							<span className="font-semibold text-sm">{authorName}</span>
							<span className="text-sm text-muted-foreground ml-2">
								{createdAt.toLocaleString()}
							</span>
						</div>
						{action}
					</div>
				</div>
			</div>

			{/* ── 本文 ─────────────────────────────── */}
			<div className="mt-2 prose dark:prose-invert">{content}</div>

			{/* ── 返信フォーム ─────────────────────── */}
			{replyForm}

			{/* ── 子コメント ───────────────────────── */}
			{children && <div className="border-l pl-4 pt-2">{children}</div>}
		</div>
	);
}

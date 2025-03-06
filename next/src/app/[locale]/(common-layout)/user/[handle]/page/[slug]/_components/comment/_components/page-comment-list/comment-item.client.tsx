// CommentItem.tsx
"use client";

import { MemoizedParsedContent } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/_components/parsed-content";
import {
	ADD_TRANSLATION_FORM_TARGET,
	VOTE_TARGET,
} from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { getImageProps } from "next/image";
import { useActionState } from "react";
import {
	type CommentDeleteActionResponse,
	commentDeleteAction,
} from "./action";
import type { PageCommentWithUserAndTranslations } from "./lib/fetch-page-comments-with-user-and-translations";
interface CommentItemProps {
	pageComment: PageCommentWithUserAndTranslations[number];
	currentHandle: string | undefined;
}

export function CommentItem({ pageComment, currentHandle }: CommentItemProps) {
	const [state, action, isPending] = useActionState<
		CommentDeleteActionResponse,
		FormData
	>(commentDeleteAction, { success: false });
	const { props } = getImageProps({
		src: pageComment.user.image,
		alt: pageComment.user.name,
		width: 40,
		height: 40,
	});

	return (
		<div className="ml-4 border-l pl-4 pt-2">
			<div className="flex items-center">
				<Avatar className="w-6 h-6 mr-3 not-prose">
					<AvatarImage {...props} />
					<AvatarFallback>
						{pageComment.user?.name.charAt(0) || "?"}
					</AvatarFallback>
				</Avatar>
				<div className="flex-1">
					<div className="flex items-center justify-between">
						<div>
							<span className="font-semibold text-sm">
								{pageComment.user?.name || "deleted_user"}
							</span>
							<span className="text-sm text-muted-foreground ml-2">
								{pageComment.createdAt}
							</span>
						</div>
						{currentHandle === pageComment.user.handle && (
							<DropdownMenu modal={false}>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										className={"h-8 w-8 p-0"}
										aria-label="More options"
									>
										<MoreVertical className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem>
										<form action={action}>
											<input
												type="hidden"
												name="pageCommentId"
												value={pageComment.id}
											/>
											<input
												type="hidden"
												name="pageId"
												value={pageComment.pageId}
											/>
											<Button type="submit" variant="ghost">
												Delete
											</Button>
										</form>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</div>
				</div>
			</div>
			<div className="mt-2 prose dark:prose-invert">
				<MemoizedParsedContent
					html={pageComment.content}
					segmentWithTranslations={
						pageComment.pageCommentSegmentsWithTranslations
					}
					currentHandle={currentHandle}
					voteTarget={VOTE_TARGET.COMMENT_SEGMENT_TRANSLATION}
					addTranslationFormTarget={
						ADD_TRANSLATION_FORM_TARGET.COMMENT_SEGMENT_TRANSLATION
					}
				/>
			</div>
			{/* 子コメントがあれば再帰的にレンダリング */}
			{pageComment.replies && pageComment.replies.length > 0 && (
				<div className="mt-4">
					{pageComment.replies.map((reply) => (
						<CommentItem
							key={reply.id}
							pageComment={reply}
							currentHandle={currentHandle}
						/>
					))}
				</div>
			)}
		</div>
	);
}

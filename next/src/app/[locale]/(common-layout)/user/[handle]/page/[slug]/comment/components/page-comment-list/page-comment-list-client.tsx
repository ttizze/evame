"use client";

import { MemoizedParsedContent } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/components/parsed-content";
import { VOTE_TARGET } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import { ADD_TRANSLATION_FORM_TARGET } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { useActionState } from "react";
import {
	type CommentDeleteActionResponse,
	commentDeleteAction,
} from "./action";
import type { PageCommentWithUser } from "./db/query.server";

interface CommentListClientProps {
	pageCommentsWithUser: PageCommentWithUser;
	currentHandle: string | undefined;
	showOriginal: boolean;
	showTranslation: boolean;
	locale: string;
}

export function PageCommentListClient({
	pageCommentsWithUser,
	currentHandle,
	showOriginal,
	showTranslation,
	locale,
}: CommentListClientProps) {
	const [state, action, isPending] = useActionState<
		CommentDeleteActionResponse,
		FormData
	>(commentDeleteAction, { success: false });
	return (
		<div className="space-y-4">
			{pageCommentsWithUser.map((pageComment) => (
				<div key={pageComment.id} className="p-2 border-t">
					<div className="flex items-center">
						<Avatar className="w-6 h-6 mr-3">
							<AvatarImage
								src={pageComment.user.image}
								alt={pageComment.user.name}
							/>
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
							locale={locale}
							voteTarget={VOTE_TARGET.COMMENT_SEGMENT_TRANSLATION}
							addTranslationFormTarget={
								ADD_TRANSLATION_FORM_TARGET.COMMENT_SEGMENT_TRANSLATION
							}
						/>
					</div>
				</div>
			))}
		</div>
	);
}

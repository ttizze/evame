import { use, useState, useTransition } from "react";
import { Tweet } from "react-tweet";
import { useHydrated } from "@/app/_hooks/use-hydrated";
import { callReaderAction } from "@/app/_service/reader-action";
import { authClient } from "@/app/[locale]/_service/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { mdastToReact } from "../../../../mdast-to-react";
import { CommentUpdates } from "../../../comment-updates";
import { CommentActionMenu } from "../../page-comment-form/comment/comment-action-menu";
import type { PageCommentWithSegments } from "../_db/queries.server";
import { CommentRepliesToggle } from "./_components/comments-replies-toggle/client";

export function PageCommentItemClient({
	pageCommentId,
	pageId,
	locale,
	userHandle,
	isDeleted,
}: {
	pageCommentId: number;
	pageId: number;
	locale: string;
	userHandle: string;
	isDeleted: boolean;
}) {
	const { refresh: updateComments } = use(CommentUpdates);
	const hydrated = useHydrated();
	const [message, setMessage] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();
	const { data: session } = authClient.useSession();

	if (!hydrated || isDeleted || session?.user.handle !== userHandle)
		return null;

	return (
		<>
			<CommentActionMenu>
				<DropdownMenuItem
					disabled={isPending}
					onSelect={() =>
						startTransition(async () => {
							const result = await callReaderAction("deleteComment", {
								locale,
								pageCommentId,
								pageId,
							});
							if (result.success) await updateComments(null);
							setMessage(result.message ?? null);
						})
					}
				>
					Delete
				</DropdownMenuItem>
			</CommentActionMenu>
			{message && <p className="text-sm text-red-500">{message}</p>}
		</>
	);
}

export function PageCommentItem({
	pageComment,
	userLocale,
}: {
	pageComment: PageCommentWithSegments;
	userLocale: string;
}) {
	const content = mdastToReact({
		Tweet,
		mdast: pageComment.mdastJson,
		segments: pageComment.content.segments,
	});
	const replies = pageComment.replies;

	return (
		<div>
			<div className="flex items-center">
				<Avatar className="mr-3 h-6 w-6 not-prose">
					<AvatarImage
						alt={pageComment.user.name}
						src={pageComment.user.image}
					/>
					<AvatarFallback>
						{pageComment.user.name?.charAt(0) || "?"}
					</AvatarFallback>
				</Avatar>
				<div className="flex-1">
					<div className="flex items-center justify-between">
						<div>
							<span className="text-sm font-semibold">
								{pageComment.user.name}
							</span>
							<span className="ml-2 text-sm text-muted-foreground">
								{new Date(pageComment.createdAt).toLocaleString(userLocale, {
									timeZone: "UTC",
								})}
							</span>
						</div>
						<PageCommentItemClient
							isDeleted={pageComment.isDeleted}
							locale={userLocale}
							pageCommentId={pageComment.id}
							pageId={pageComment.pageId}
							userHandle={pageComment.user.handle}
						/>
					</div>
				</div>
			</div>
			{pageComment.isDeleted ? (
				<div className="mt-2 prose dark:prose-invert">
					<p>This comment has been deleted.</p>
				</div>
			) : (
				<div className="mt-2 prose dark:prose-invert">{content}</div>
			)}
			<CommentRepliesToggle
				commentId={pageComment.id}
				pageId={pageComment.pageId}
				replyCount={pageComment.replyCount}
				userLocale={userLocale}
			/>

			{replies.length > 0 && (
				<div>
					<div className="relative h-4">
						<Separator
							className="absolute left-1/2 -translate-x-1/2 bg-foreground"
							orientation="vertical"
						/>
					</div>
					{replies.map((reply) => (
						<PageCommentItem
							key={reply.id}
							pageComment={reply}
							userLocale={userLocale}
						/>
					))}
				</div>
			)}
		</div>
	);
}

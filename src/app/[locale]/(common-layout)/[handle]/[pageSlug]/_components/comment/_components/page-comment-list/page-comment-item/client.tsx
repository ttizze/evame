import { use, useActionState } from "react";
import { Tweet } from "react-tweet";
import { useHydrated } from "@/app/_hooks/use-hydrated";
import { callReaderAction } from "@/app/_service/reader-action";
import { authClient } from "@/app/[locale]/_service/auth-client";
import type { CommentDeleteActionResponse } from "@/app/api/reader-actions/_service/delete-comment";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
}: {
	pageCommentId: number;
	pageId: number;
	locale: string;
	userHandle: string;
}) {
	const updateComments = use(CommentUpdates);
	const hydrated = useHydrated();
	const [state, formAction, isPending] = useActionState<
		CommentDeleteActionResponse,
		FormData
	>(
		async (_previousState, formData) => {
			const result = await callReaderAction("deleteComment", {
				locale: String(formData.get("locale") ?? locale),
				pageCommentId: Number(formData.get("pageCommentId")),
				pageId: Number(formData.get("pageId")),
			});
			if (result.success) await updateComments(null);
			return result;
		},
		{ success: false },
	);
	const { data: session } = authClient.useSession();

	if (!hydrated || session?.user.handle !== userHandle) return null;

	return (
		<>
			<CommentActionMenu>
				<DropdownMenuItem asChild onSelect={(event) => event.preventDefault()}>
					<form action={formAction} className="w-full">
						<input name="pageCommentId" type="hidden" value={pageCommentId} />
						<input name="pageId" type="hidden" value={pageId} />
						<input name="locale" type="hidden" value={locale} />
						<Button disabled={isPending} type="submit" variant="ghost">
							Delete
						</Button>
					</form>
				</DropdownMenuItem>
			</CommentActionMenu>
			{state.message && <p className="text-sm text-red-500">{state.message}</p>}
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

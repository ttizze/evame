import { getImageProps } from "next/image";
import { mdastToReact } from "@/app/[locale]/(common-layout)/_components/mdast-to-react/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type { PageCommentWithSegments } from "../_db/queries.server";
import { listChildPageComments } from "../_db/queries.server";
import { CommentRepliesToggle } from "./_components/comments-replies-toggle/client";
import { PageCommentItemClient } from "./client";

function CommentHeader({
	pageComment,
	userLocale,
}: {
	pageComment: PageCommentWithSegments;
	userLocale: string;
}) {
	const { props } = getImageProps({
		src: pageComment.user.image,
		alt: pageComment.user.name,
		width: 40,
		height: 40,
	});

	return (
		<div className="flex items-center">
			<Avatar className="w-6 h-6 mr-3 not-prose">
				<AvatarImage {...props} />
				<AvatarFallback>
					{pageComment.user.name?.charAt(0) || "?"}
				</AvatarFallback>
			</Avatar>
			<div className="flex-1">
				<div className="flex items-center justify-between">
					<div>
						<span className="font-semibold text-sm">
							{pageComment.user.name}
						</span>
						<span className="text-sm text-muted-foreground ml-2">
							{pageComment.createdAt.toLocaleString(userLocale)}
						</span>
					</div>
					<PageCommentItemClient
						key={pageComment.id}
						pageCommentId={pageComment.id}
						pageId={pageComment.pageId}
						user={{ handle: pageComment.user?.handle ?? "" }}
					/>
				</div>
			</div>
		</div>
	);
}

function RepliesBlock({
	replies,
	userLocale,
}: {
	replies: PageCommentWithSegments[];
	userLocale: string;
}) {
	return (
		<div>
			<div className="relative h-4">
				<Separator
					className="absolute left-1/2 -translate-x-1/2 bg-foreground"
					orientation="vertical"
				/>
			</div>
			{replies.map((r) => (
				<PageCommentItem key={r.id} pageComment={r} userLocale={userLocale} />
			))}
		</div>
	);
}

interface Props {
	pageComment: PageCommentWithSegments;
	userLocale: string;
}

export default async function PageCommentItem({
	pageComment,
	userLocale,
}: Props) {
	const content = await mdastToReact({
		mdast: pageComment.mdastJson,
		segments: pageComment.content.segments,
	});

	// Always fetch replies so the page remains static; visibility is toggled on client
	const replies = await listChildPageComments(pageComment.id, userLocale);

	return (
		<div>
			<CommentHeader pageComment={pageComment} userLocale={userLocale} />
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
				userLocale={userLocale}
			/>

			{replies.length > 0 ? (
				<RepliesBlock replies={replies} userLocale={userLocale} />
			) : null}
		</div>
	);
}

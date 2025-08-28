import { unstable_noStore as noStore } from "next/cache";
import { Suspense } from "react";
import { mdastToReact } from "@/app/[locale]/_components/mdast-to-react/server";
import { CommentList } from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_components/comment/_components/page-comment-form/comment/comment-list.client";
import type { PageCommentWithSegments } from "../_db/queries.server";
import { listChildPageComments } from "../_db/queries.server";
import { PageCommentItemClient } from "./client";
import { PageCommentReplyForm } from "./reply-form.client";
import { RepliesToggle } from "./toggle.client";

interface Props {
	pageComment: PageCommentWithSegments;
	userLocale: string;
	expandedIds: number[];
}

export default async function PageCommentItem({
	pageComment,
	userLocale,
	expandedIds,
}: Props) {
	noStore();
	const content = await mdastToReact({
		mdast: pageComment.mdastJson,
		segments: pageComment.content.segments,
	});

	const isExpanded = expandedIds.includes(pageComment.id);
	const children = isExpanded
		? await listChildPageComments(pageComment.id, userLocale)
		: [];

	return (
		<CommentList
			action={
				<PageCommentItemClient key={pageComment.id} pageComment={pageComment} />
			}
			authorImage={pageComment.user?.image}
			authorName={pageComment.user?.name || "deleted_user"}
			content={content}
			createdAt={pageComment.createdAt}
			replyForm={
				<>
					<RepliesToggle
						commentId={pageComment.id}
						isExpanded={isExpanded}
						replyCount={pageComment.replyCount ?? children.length}
					/>
					<PageCommentReplyForm
						pageId={pageComment.pageId}
						parentId={pageComment.id}
						userLocale={userLocale}
					/>
				</>
			}
		>
			<Suspense
				fallback={
					<div className="mt-2 text-sm text-muted-foreground">
						Loading replies...
					</div>
				}
			>
				{children.map((r) => (
					<PageCommentItem
						expandedIds={expandedIds}
						key={r.id}
						pageComment={r}
						userLocale={userLocale}
					/>
				))}
			</Suspense>
		</CommentList>
	);
}

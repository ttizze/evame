import { CommentList } from "@/app/[locale]/_components/comment/comment-list.client";
import { mdastToReact } from "@/app/[locale]/_components/mdast-to-react/server";
import type { PageCommentWithUserAndTranslations } from "../_lib/fetch-page-comments-with-user-and-translations";
import { PageCommentItemClient } from "./client";
import { PageCommentReplyForm } from "./reply-form.client";

interface Props {
	pageComment: PageCommentWithUserAndTranslations[number];
	currentHandle: string | undefined;
	userLocale: string;
}

export default async function PageCommentItem({
	pageComment,
	currentHandle,
	userLocale,
}: Props) {
	const content = await mdastToReact({
		mdast: pageComment.mdastJson,
		bundles: pageComment.segmentBundles,
		currentHandle,
	});

	return (
		<CommentList
			action={
				<PageCommentItemClient
					currentHandle={currentHandle}
					key={pageComment.id}
					pageComment={pageComment}
				/>
			}
			authorImage={pageComment.user?.image}
			authorName={pageComment.user?.name || "deleted_user"}
			content={content}
			createdAt={pageComment.createdAt}
			replyForm={
				<PageCommentReplyForm
					currentHandle={currentHandle}
					pageId={pageComment.pageId}
					parentId={pageComment.id}
					userLocale={userLocale}
				/>
			}
		>
			{pageComment.replies?.map((r) => (
				<PageCommentItem
					currentHandle={currentHandle}
					key={r.id}
					pageComment={r}
					userLocale={userLocale}
				/>
			))}
		</CommentList>
	);
}

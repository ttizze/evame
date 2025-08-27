import { mdastToReact } from "@/app/[locale]/_components/mdast-to-react/server";
import { CommentList } from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_components/comment/_components/page-comment-form/comment/comment-list.client";
import type { PageCommentWithUserAndTranslations } from "../_lib/fetch-page-comments-with-user-and-translations";
import { PageCommentItemClient } from "./client";
import { PageCommentReplyForm } from "./reply-form.client";

interface Props {
	pageComment: PageCommentWithUserAndTranslations[number];
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
				<PageCommentReplyForm
					pageId={pageComment.pageId}
					parentId={pageComment.id}
					userLocale={userLocale}
				/>
			}
		>
			{pageComment.replies?.map((r) => (
				<PageCommentItem key={r.id} pageComment={r} userLocale={userLocale} />
			))}
		</CommentList>
	);
}

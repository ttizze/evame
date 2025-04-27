import { CommentList } from "@/app/[locale]/_components/comment/comment-list.client";
import { mdastToReact } from "@/app/[locale]/_components/mdast-to-react";
import type { ProjectCommentWithUserAndTranslations } from "../_lib/fetch-project-comments-with-user-and-translations";
import { ProjectCommentItemClient } from "./client";
import { ProjectCommentReplyForm } from "./reply-form.client";
interface ProjectCommentItemProps {
	projectComment: ProjectCommentWithUserAndTranslations[number];
	currentHandle: string | undefined;
	userLocale: string;
}

export default async function ProjectCommentItem({
	projectComment,
	currentHandle,
	userLocale,
}: ProjectCommentItemProps) {
	const content = await mdastToReact({
		mdast: projectComment.mdastJson,
		bundles: projectComment.segmentBundles,
		currentHandle: currentHandle,
	});
	return (
		<CommentList
			authorName={projectComment.user?.name || "deleted_user"}
			authorImage={projectComment.user?.image}
			createdAt={projectComment.createdAt}
			content={content}
			action={
				<ProjectCommentItemClient
					projectComment={projectComment}
					currentHandle={currentHandle}
				/>
			}
			replyForm={
				<ProjectCommentReplyForm
					projectId={projectComment.projectId}
					currentHandle={currentHandle}
					parentId={projectComment.id}
					userLocale={userLocale}
				/>
			}
		>
			{projectComment.replies?.map((r) => (
				<ProjectCommentItem
					key={r.id}
					projectComment={r}
					currentHandle={currentHandle}
					userLocale={userLocale}
				/>
			))}
		</CommentList>
	);
}

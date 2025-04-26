import { getCurrentUser } from "@/auth";
import { fetchProjectCommentsWithUserAndTranslations } from "./_lib/fetch-project-comments-with-user-and-translations";
import ProjectCommentItem from "./project-comment-item/server";

interface CommentListProps {
	userLocale: string;
	projectId: string;
}

export async function ProjectCommentList({
	userLocale,
	projectId,
}: CommentListProps) {
	const currentUser = await getCurrentUser();
	const projectCommentsWithUserAndTranslations =
		await fetchProjectCommentsWithUserAndTranslations(
			projectId,
			userLocale,
			currentUser?.id,
		);
	return (
		<div className="space-y-4">
			{projectCommentsWithUserAndTranslations.map((projectComment) => {
				return (
					<ProjectCommentItem
						key={projectComment.id}
						projectComment={projectComment}
						currentHandle={currentUser?.handle}
						userLocale={userLocale}
					/>
				);
			})}
		</div>
	);
}

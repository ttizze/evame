import { mdastToReact } from "@/app/[locale]/_components/mdast-to-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getImageProps } from "next/image";
import type { ProjectCommentWithUserAndTranslations } from "../_lib/fetch-project-comments-with-user-and-translations";
import { ProjectCommentItemClient } from "./client";
import { ReplyForm } from "./reply-form.client";

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
	const { props } = getImageProps({
		src: projectComment.user.image,
		alt: projectComment.user.name,
		width: 40,
		height: 40,
	});
	const content = await mdastToReact({
		mdast: projectComment.mdastJson,
		bundles: projectComment.segmentBundles,
		currentHandle: currentHandle,
	});
	return (
		<div className="">
			<div className="flex items-center">
				<Avatar className="w-6 h-6 mr-3 not-prose">
					<AvatarImage {...props} />
					<AvatarFallback>
						{projectComment.user?.name.charAt(0) || "?"}
					</AvatarFallback>
				</Avatar>
				<div className="flex-1">
					<div className="flex items-center justify-between">
						<div>
							<span className="font-semibold text-sm">
								{projectComment.user?.name || "deleted_user"}
							</span>
							<span className="text-sm text-muted-foreground ml-2">
								{projectComment.createdAt}
							</span>
						</div>
						<ProjectCommentItemClient
							projectComment={projectComment}
							currentHandle={currentHandle}
						/>
					</div>
				</div>
			</div>
			<div className="mt-2 prose dark:prose-invert">{content}</div>
			<ReplyForm
				projectId={projectComment.projectId}
				currentHandle={currentHandle}
				parentId={projectComment.id}
				userLocale={userLocale}
			/>
			{projectComment.replies && projectComment.replies.length > 0 && (
				<div className="border-l pl-4 pt-2">
					{projectComment.replies.map((reply) => (
						<ProjectCommentItem
							key={reply.id}
							projectComment={reply}
							currentHandle={currentHandle}
							userLocale={userLocale}
						/>
					))}
				</div>
			)}
		</div>
	);
}

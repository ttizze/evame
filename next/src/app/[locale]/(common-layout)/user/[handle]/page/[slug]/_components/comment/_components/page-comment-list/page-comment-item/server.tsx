import { MemoizedParsedContent } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/_components/parsed-content";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getImageProps } from "next/image";
import type { PageCommentWithUserAndTranslations } from "../_lib/fetch-page-comments-with-user-and-translations";
import { PageCommentItemClient } from "./client";
import { ReplyForm } from "./reply-form.client";
interface PageCommentItemProps {
	pageComment: PageCommentWithUserAndTranslations[number];
	currentHandle: string | undefined;
}

export default function PageCommentItem({
	pageComment,
	currentHandle,
}: PageCommentItemProps) {
	const { props } = getImageProps({
		src: pageComment.user.image,
		alt: pageComment.user.name,
		width: 40,
		height: 40,
	});

	return (
		<div className="">
			<div className="flex items-center">
				<Avatar className="w-6 h-6 mr-3 not-prose">
					<AvatarImage {...props} />
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
						<PageCommentItemClient
							pageComment={pageComment}
							currentHandle={currentHandle}
						/>
					</div>
				</div>
			</div>
			<div className="mt-2 prose dark:prose-invert">
				<MemoizedParsedContent
					html={pageComment.content}
					segmentBundles={pageComment.segmentBundles}
					currentHandle={currentHandle}
				/>
			</div>
			<ReplyForm
				pageId={pageComment.pageId}
				currentHandle={currentHandle}
				parentId={pageComment.id}
			/>
			{pageComment.replies && pageComment.replies.length > 0 && (
				<div className="border-l pl-4 pt-2">
					{pageComment.replies.map((reply) => (
						<PageCommentItem
							key={reply.id}
							pageComment={reply}
							currentHandle={currentHandle}
						/>
					))}
				</div>
			)}
		</div>
	);
}

"use client";

import { CommentActionMenu } from "@/app/[locale]/_components/comment/comment-action-menu.client";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Trash } from "lucide-react";
import { useActionState } from "react";
import type { ProjectCommentWithUserAndTranslations } from "../_lib/fetch-project-comments-with-user-and-translations";
import {
	type CommentDeleteActionResponse,
	deleteProjectCommentAction,
} from "./action";
interface ProjectCommentItemClientProps {
	projectComment: ProjectCommentWithUserAndTranslations[number];
	currentHandle: string | undefined;
}

export function ProjectCommentItemClient({
	projectComment,
	currentHandle,
}: ProjectCommentItemClientProps) {
	const [state, action, isPending] = useActionState<
		CommentDeleteActionResponse,
		FormData
	>(deleteProjectCommentAction, { success: false });

	if (currentHandle !== projectComment.user.handle) return null;

	return (
		<CommentActionMenu>
			<DropdownMenuItem asChild>
				<form action={action} className="w-full">
					<input
						type="hidden"
						name="projectCommentId"
						value={projectComment.id}
					/>
					<input
						type="hidden"
						name="projectId"
						value={projectComment.projectId}
					/>
					<Button type="submit" variant="ghost" disabled={isPending}>
						<Trash className="mr-2 h-4 w-4" />
						Delete
					</Button>
				</form>
			</DropdownMenuItem>
		</CommentActionMenu>
	);
}

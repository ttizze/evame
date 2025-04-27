/* ProjectCommentForm.tsx */
"use client";
import { CommentForm } from "@/app/[locale]/_components/comment/comment-form.client";
import { useActionState, useEffect } from "react";
import { commentAction } from "./action";
import type { CommentActionResponse } from "./action";

export function ProjectCommentForm({
	projectId,
	userLocale,
	currentHandle,
	parentId,
	onReplySuccess,
}: {
	projectId: number;
	userLocale: string;
	currentHandle: string | undefined;
	parentId?: number;
	onReplySuccess?: () => void;
}) {
	const [state, action, isPending] = useActionState<
		CommentActionResponse,
		FormData
	>(commentAction, { success: false });

	useEffect(() => {
		if (state.success) onReplySuccess?.();
	}, [state.success, onReplySuccess]);

	return (
		<CommentForm
			action={action}
			hidden={{ projectId, userLocale, parentId }}
			currentHandle={currentHandle}
			isPending={isPending}
			errorMsg={state.zodErrors?.content}
		/>
	);
}

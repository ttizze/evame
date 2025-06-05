/* PageCommentForm.tsx */
"use client";
import { CommentForm } from "@/app/[locale]/_components/comment/comment-form.client";
import { useTranslationJobToast } from "@/app/[locale]/_hooks/use-translation-job-toast";
import { useTranslationJobs } from "@/app/[locale]/_hooks/use-translation-jobs";
import { useActionState, useEffect } from "react";
import { commentAction } from "./action";
import type { CommentActionResponse } from "./action";

export function PageCommentForm({
	pageId,
	userLocale,
	currentHandle,
	parentId,
	onReplySuccess,
}: {
	pageId: number;
	userLocale: string;
	currentHandle: string | undefined;
	parentId?: number;
	onReplySuccess?: () => void;
}) {
	const [state, action, isPending] = useActionState<
		CommentActionResponse,
		FormData
	>(commentAction, { success: false });

	const { jobs } = useTranslationJobs(
		state.success ? (state.data?.translationJobs ?? []) : [],
	);

	useTranslationJobToast(jobs);
	useEffect(() => {
		if (state.success) onReplySuccess?.();
	}, [state.success, onReplySuccess]);

	return (
		<CommentForm
			action={action}
			hidden={{ pageId, userLocale, parentId }}
			currentHandle={currentHandle}
			isPending={isPending}
			errorMsg={!state.success ? state.zodErrors?.content : undefined}
		/>
	);
}

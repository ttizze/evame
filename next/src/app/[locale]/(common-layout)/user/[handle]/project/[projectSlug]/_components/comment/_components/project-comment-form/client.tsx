/* ProjectCommentForm.tsx */
"use client";

import { CommentForm } from "@/app/[locale]/_components/comment/comment-form.client";
import { useTranslationJobToast } from "@/app/[locale]/_hooks/use-translation-job-toast";
import { useTranslationJobs } from "@/app/[locale]/_hooks/use-translation-jobs";
import { useActionState, useEffect } from "react";
import { commentAction } from "./action";
import type { CommentActionResponse } from "./action";

type Props = {
	projectId: number;
	userLocale: string;
	currentHandle?: string;
	parentId?: number;
	onReplySuccess?: () => void;
};

export function ProjectCommentForm({
	projectId,
	userLocale,
	currentHandle,
	parentId,
	onReplySuccess,
}: Props) {
	const [state, formAction, isPending] = useActionState<
		CommentActionResponse,
		FormData
	>(commentAction, { success: false });

	const { jobs } = useTranslationJobs(
		state.success ? state.data.translationJobs : [],
	);

	useTranslationJobToast(jobs);

	// 投稿成功コールバック
	useEffect(() => {
		if (state.success) onReplySuccess?.();
	}, [state.success, onReplySuccess]);

	return (
		<CommentForm
			action={formAction}
			hidden={{ projectId, userLocale, parentId }}
			currentHandle={currentHandle}
			isPending={isPending}
			errorMsg={state.success ? undefined : state.zodErrors?.content}
		/>
	);
}

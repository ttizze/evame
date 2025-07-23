/* PageCommentForm.tsx */
"use client";
import { useActionState, useEffect } from "react";
import { useTranslationJobToast } from "@/app/[locale]/_hooks/use-translation-job-toast";
import { useTranslationJobs } from "@/app/[locale]/_hooks/use-translation-jobs";
import { CommentForm } from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_components/comment/_components/page-comment-form/comment/comment-form.client";
import type { CommentActionResponse } from "./action";
import { commentAction } from "./action";

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

	const { toastJobs } = useTranslationJobs(
		state.success ? (state.data?.translationJobs ?? []) : [],
	);

	useTranslationJobToast(toastJobs);
	useEffect(() => {
		if (state.success) onReplySuccess?.();
	}, [state.success, onReplySuccess]);

	return (
		<CommentForm
			action={action}
			currentHandle={currentHandle}
			errorMsg={!state.success ? state.zodErrors?.content : undefined}
			hidden={{ pageId, userLocale, parentId }}
			isPending={isPending}
		/>
	);
}

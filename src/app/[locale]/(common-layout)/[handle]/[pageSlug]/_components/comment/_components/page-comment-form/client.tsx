import { use, useActionState, useEffect, useRef } from "react";
import { callReaderAction } from "@/app/_service/reader-action";
import { useTranslationJobToast } from "@/app/[locale]/_hooks/use-translation-job-toast";
import { useTranslationJobs } from "@/app/[locale]/_hooks/use-translation-jobs";
import type { CommentActionResponse } from "@/app/api/reader-actions/_service/add-comment";
import { CommentUpdates } from "../../comment-updates";
import { CommentForm } from "./comment/comment-form";

function optionalNumber(value: FormDataEntryValue | null) {
	if (typeof value !== "string" || value.trim() === "") return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

export function PageCommentForm({
	pageId,
	userLocale,
	parentId,
	onReplySuccess,
}: {
	pageId: number;
	userLocale: string;
	parentId?: number;
	onReplySuccess?: () => void;
}) {
	const updateComments = use(CommentUpdates);
	const [state, formAction, isPending] = useActionState<
		CommentActionResponse,
		FormData
	>(
		async (_previousState, formData) => {
			const result = await callReaderAction("comment", {
				content: String(formData.get("content") ?? ""),
				contentFormat: "markdown",
				pageCommentId: optionalNumber(formData.get("pageCommentId")),
				pageId: Number(formData.get("pageId")),
				parentId: optionalNumber(formData.get("parentId")),
				userLocale: String(formData.get("userLocale") ?? userLocale),
			});
			if (result.success) {
				await updateComments(result.data.commentPage);
			}
			return result;
		},
		{ success: false },
	);

	const successHandled = useRef(false);
	useEffect(() => {
		if (!state.success) {
			successHandled.current = false;
			return;
		}
		if (successHandled.current) return;
		successHandled.current = true;
		onReplySuccess?.();
	}, [state.success, onReplySuccess]);

	const { toastJobs } = useTranslationJobs(
		state.success ? state.data.translationJobs : [],
	);
	useTranslationJobToast(toastJobs);

	return (
		<div className="space-y-2">
			<CommentForm
				action={formAction}
				errorMsg={!state.success ? state.zodErrors?.content : undefined}
				hidden={{ pageId, parentId, userLocale }}
				isPending={isPending}
			/>
			{state.message && <p className="text-sm text-red-500">{state.message}</p>}
		</div>
	);
}

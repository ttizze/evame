"use client";
import { Editor } from "@/app/[locale]/(edit-layout)/user/[handle]/page/[slug]/edit/_components/editor/editor";
import { StartButton } from "@/app/[locale]/_components/start-button";
import { Button } from "@/components/ui/button";
import { useActionState, useEffect, useState } from "react";
import { type CommentActionResponse, commentAction } from "./action";

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
	const [content, setContent] = useState("");
	const [state, action, isPending] = useActionState<
		CommentActionResponse,
		FormData
	>(commentAction, { success: false });
	useEffect(() => {
		if (state.success) {
			onReplySuccess?.();
		}
	}, [state.success, onReplySuccess]);
	return (
		<>
			<form action={action} className="space-y-4 relative">
				<input type="hidden" name="pageId" value={pageId} />
				<input type="hidden" name="userLocale" value={userLocale} />
				{parentId && <input type="hidden" name="parentId" value={parentId} />}
				<Editor
					defaultValue={content}
					name="content"
					className={`border border-input rounded-md px-2 ${!currentHandle ? "opacity-50 bg-muted" : ""}`}
					placeholder="Say Hello!"
					onEditorUpdate={(editor) => setContent(editor?.getHTML() ?? "")}
				/>
				{!currentHandle && (
					<StartButton className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
				)}
				<Button
					type="submit"
					disabled={isPending || !currentHandle}
					className={`w-full ${!currentHandle ? "opacity-50 bg-muted" : ""}`}
				>
					{isPending ? "posting" : "post"}
				</Button>
			</form>
			{state.zodErrors?.content && (
				<p className="text-sm text-red-500">{state.zodErrors.content}</p>
			)}
		</>
	);
}

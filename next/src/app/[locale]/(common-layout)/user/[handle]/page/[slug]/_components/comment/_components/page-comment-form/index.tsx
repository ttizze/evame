"use client";
import { Editor } from "@/app/[locale]/(edit-layout)/user/[handle]/page/[slug]/edit/_components/editor/editor";
import { StartButton } from "@/app/[locale]/_components/start-button";
import { Button } from "@/components/ui/button";
import { useActionState, useState } from "react";
import { type CommentActionResponse, commentAction } from "./action";

export function PageCommentForm({
	pageId,
	currentHandle,
}: {
	pageId: number;
	currentHandle: string | undefined;
}) {
	const [content, setContent] = useState("");
	const [state, action, isPending] = useActionState<
		CommentActionResponse,
		FormData
	>(commentAction, { success: false });

	return (
		<>
			<form action={action} className="space-y-4 relative">
				<input type="hidden" name="pageId" value={pageId} />
				<Editor
					defaultValue={""}
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

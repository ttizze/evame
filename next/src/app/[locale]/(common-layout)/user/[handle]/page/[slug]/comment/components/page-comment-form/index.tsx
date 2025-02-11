"use client";
import { StartButton } from "@/app/[locale]/components/start-button";
import { Editor } from "@/app/[locale]/user/[handle]/page/[slug]/edit/components/editor/editor";
import type { ActionState } from "@/app/types";
import { Button } from "@/components/ui/button";
import { useActionState, useState } from "react";
import { commentAction } from "./action";

export function PageCommentForm({
	pageId,
	currentHandle,
}: {
	pageId: number;
	currentHandle: string | undefined;
}) {
	const [content, setContent] = useState("");
	const [state, action, isPending] = useActionState<ActionState, FormData>(
		commentAction,
		{ success: false },
	);

	return (
		<>
			<form
				action={action}
				className="space-y-4 relative prose dark:prose-invert"
			>
				<input type="hidden" name="pageId" value={pageId} />
				<Editor
					defaultValue={""}
					name="content"
					className="border border-input rounded-md px-2"
					placeholder="Say Hello!"
					onEditorUpdate={(editor) => setContent(editor?.getHTML() ?? "")}
				/>
				{!currentHandle && (
					<StartButton className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
				)}
				<Button
					type="submit"
					disabled={isPending || !currentHandle || !content}
					className={"w-full"}
				>
					{isPending ? "posting" : "post"}
				</Button>
			</form>
			{state.error && <p className="text-sm text-red-500">{state.error}</p>}
		</>
	);
}

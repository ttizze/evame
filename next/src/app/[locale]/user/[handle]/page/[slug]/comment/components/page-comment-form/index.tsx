"use client";
import { StartButton } from "@/app/[locale]/components/start-button";
import type { ActionState } from "@/app/types";
import { Button } from "@/components/ui/button";
import { useActionState } from "react";
import { z } from "zod";
import { Editor } from "../../../edit/components/editor/editor";
import { commentAction } from "./action";

export const createPageCommentSchema = z.object({
	pageId: z.number(),
	content: z.string().min(1, "Comment cannot be empty"),
});

export function PageCommentForm({
	pageId,
	currentHandle,
}: {
	pageId: number;
	currentHandle: string | undefined;
}) {
	const [state, action, isPending] = useActionState<ActionState, FormData>(
		commentAction,
		{},
	);

	return (
		<>
			<form
				action={action}
				className="space-y-4 relative prose dark:prose-invert"
			>
				<input type="hidden" name="pageId" value={pageId} />
				<input type="hidden" name="intent" value="create" />
				<Editor
					defaultValue={""}
					name="content"
					className="border border-input rounded-md px-2"
					placeholder="Say Hello!"
				/>
				{!currentHandle && (
					<StartButton className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
				)}
				<Button
					type="submit"
					disabled={isPending || !currentHandle}
					className={"w-full"}
				>
					{isPending ? "posting" : "post"}
				</Button>
			</form>
			{state.generalError && (
				<p className="text-sm text-red-500">{state.generalError}</p>
			)}
		</>
	);
}

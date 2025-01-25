import { getFormProps, useForm } from "@conform-to/react";
import { useInputControl } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { useFetcher } from "@remix-run/react";
import { StartButton } from "~/components/StartButton";
import { Editor } from "~/routes/$locale+/user.$handle+/page+/$slug+/edit/components/editor/Editor";
import { Button } from "../../../../../../../components/ui/button";
import { schema } from "../route";
import type { action } from "../route";

export function PageCommentForm({
	pageId,
	currentHandle,
}: { pageId: number; currentHandle: string | undefined }) {
	const fetcher = useFetcher<typeof action>();
	const commentControl = useInputControl({
		name: "content",
		formId: "comment-form",
	});
	const [form, fields] = useForm({
		lastResult: fetcher.data?.lastResult,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema });
		},
		id: "comment-form",
		shouldValidate: "onInput",
		defaultValue: {
			pageId: pageId,
			content: "",
		},
	});

	return (
		<>
			<fetcher.Form
				method="POST"
				{...getFormProps(form)}
				action="./comment"
				className="space-y-4 relative prose dark:prose-invert"
			>
				<input type="hidden" name="pageId" value={pageId} />
				<input type="hidden" name="intent" value="create" />
				<Editor
					defaultValue={""}
					InputControl={commentControl}
					className="border border-input rounded-md px-2"
					placeholder="Say Hello!"
				/>
				{!currentHandle && (
					<StartButton className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
				)}
				<Button
					type="submit"
					disabled={fetcher.state !== "idle" || !currentHandle}
					className={"w-full"}
				>
					{fetcher.state !== "idle" ? "posting" : "post"}
				</Button>
			</fetcher.Form>
			{fields.content.errors && (
				<p className="text-sm text-red-500">
					{fields.content.errors?.join(", ")}
				</p>
			)}
		</>
	);
}

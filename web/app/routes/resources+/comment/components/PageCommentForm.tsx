import { Button } from "../../../../components/ui/button";
import { Textarea } from "../../../../components/ui/textarea";

import { getFormProps, getTextareaProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { useFetcher } from "@remix-run/react";
import { StartButton } from "~/components/StartButton";
import { schema } from "../route";
import type { action } from "../route";
export function PageCommentForm({
	pageId,
	currentHandle,
}: { pageId: number; currentHandle: string | undefined }) {
	const fetcher = useFetcher<typeof action>();
	const [form, fields] = useForm({
		lastResult: fetcher.data?.lastResult,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema });
		},
		id: "comment-form",
		shouldValidate: "onInput",
		defaultValue: {
			pageId: pageId,
			text: "",
		},
	});

	return (
		<>
			<fetcher.Form
				method="POST"
				{...getFormProps(form)}
				action="/resources/comment"
				className="space-y-4 "
			>
				<input type="hidden" name="pageId" value={pageId} />
				<input type="hidden" name="intent" value="create" />
				<Textarea
					{...getTextareaProps(fields.text)}
					placeholder="comment"
					className={`min-h-[100px] w-full ${!currentHandle && "bg-muted"}`}
					disabled={!currentHandle}
				/>
				{!currentHandle && (
					<StartButton className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
				)}
				<Button
					type="submit"
					disabled={fetcher.state !== "idle" || !currentHandle}
					className={"w-full "}
				>
					{fetcher.state !== "idle" ? "posting" : "post"}
				</Button>
			</fetcher.Form>
			{fields.text.errors && (
				<p className="text-sm text-red-500">{fields.text.errors?.join(", ")}</p>
			)}
		</>
	);
}

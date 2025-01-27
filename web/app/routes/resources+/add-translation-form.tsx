import { getFormProps, getTextareaProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { getZodConstraint } from "@conform-to/zod";
import type { ActionFunctionArgs } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import { ArrowUpFromLine } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";
import { z } from "zod";
import { StartButton } from "~/components/StartButton";
import { Button } from "~/components/ui/button";
import i18nServer from "~/i18n.server";
import { authenticator } from "~/utils/auth.server";
import { addUserTranslation } from "./functions/mutations.server";
const schema = z.object({
	segmentId: z.number(),
	text: z
		.string()
		.min(1, "Translation cannot be empty")
		.max(30000, "Translation is too long")
		.transform((val) => val.trim()),
});

export async function action({ params, request }: ActionFunctionArgs) {
	const currentUser = await authenticator.isAuthenticated(request, {
		failureRedirect: "/auth/login",
	});
	const submission = parseWithZod(await request.formData(), {
		schema,
	});
	let locale = params.locale;
	if (!locale) {
		locale = (await i18nServer.getLocale(request)) || "en";
	}

	if (submission.status !== "success") {
		return { lastResult: submission.reply() };
	}

	await addUserTranslation(
		submission.value.segmentId,
		submission.value.text,
		currentUser.id,
		locale,
	);
	return {
		lastResult: submission.reply({ resetForm: true }),
	};
}

interface AddTranslationFormProps {
	segmentId: number;
	currentHandle: string | undefined;
}

export function AddTranslationForm({
	segmentId,
	currentHandle,
}: AddTranslationFormProps) {
	const fetcher = useFetcher<typeof action>();
	const [form, fields] = useForm({
		lastResult: fetcher.data?.lastResult,
		id: `add-translation-form-${segmentId}`,
		constraint: getZodConstraint(schema),
		shouldValidate: "onBlur",
		shouldRevalidate: "onInput",
		onValidate({ formData }) {
			return parseWithZod(formData, { schema });
		},
	});

	return (
		<div className="mt-4 px-4">
			<fetcher.Form
				method="post"
				{...getFormProps(form)}
				action={"/resources/add-translation-form"}
			>
				{form.errors}
				<input type="hidden" name="segmentId" value={segmentId} />
				<div className="relative">
					<TextareaAutosize
						{...getTextareaProps(fields.text)}
						className={`w-full mb-2 rounded-xl p-2 !text-base border border-gray-500 bg-background resize-none overflow-hidden ${!currentHandle && "bg-muted"}`}
						placeholder="Or enter your translation..."
						disabled={!currentHandle}
						minRows={3}
					/>
					{!currentHandle && (
						<StartButton className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
					)}
				</div>
				<div className="space-x-2 flex justify-end items-center">
					{fields.text.errors && (
						<p className="text-red-500 text-sm">{fields.text.errors}</p>
					)}
					<Button
						type="submit"
						name="intent"
						value="add"
						className="rounded-xl"
						disabled={
							fetcher.state !== "idle" ||
							!currentHandle ||
							!fields.text?.value?.trim()
						}
					>
						<ArrowUpFromLine className="h-4 w-4" />
						Submit
					</Button>
				</div>
			</fetcher.Form>
		</div>
	);
}

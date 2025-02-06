import { useForm } from "@conform-to/react";
import { getFormProps, getInputProps } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { useFetcher } from "@remix-run/react";
import { ArrowDownToLine } from "lucide-react";
import { ExternalLink, Key, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { validateGeminiApiKey } from "~/features/translate/services/gemini";
import { authenticator } from "~/utils/auth.server";
import { updateGeminiApiKey } from "./functions/mutations.server";

export const geminiApiKeySchema = z.object({
	geminiApiKey: z.string().optional(),
});

export async function loader() {
	return redirect("/");
}

export async function action({ request }: ActionFunctionArgs) {
	const currentUser = await authenticator.isAuthenticated(request, {
		failureRedirect: "/",
	});
	const submission = parseWithZod(await request.formData(), {
		schema: geminiApiKeySchema,
	});
	if (submission.status !== "success") {
		return {
			lastResult: submission.reply({
				formErrors: ["Invalid input"],
			}),
			success: false,
		};
	}

	const { geminiApiKey } = submission.value;

	if (geminiApiKey && geminiApiKey.trim() !== "") {
		const { isValid, errorMessage } = await validateGeminiApiKey(geminiApiKey);
		if (!isValid) {
			return {
				lastResult: submission.reply({
					formErrors: [errorMessage || "Gemini API key validation failed"],
				}),
				success: false,
			};
		}
	}
	await updateGeminiApiKey(currentUser.id, geminiApiKey || "");
	return { lastResult: submission.reply(), success: true };
}
interface GeminiApiKeyDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

export function GeminiApiKeyDialog({
	isOpen,
	onOpenChange,
}: GeminiApiKeyDialogProps) {
	const fetcher = useFetcher<typeof action>();
	const actionData = fetcher.data;
	const [form, { geminiApiKey }] = useForm({
		id: "gemini-api-key-form",
		lastResult: actionData?.lastResult,
		constraint: getZodConstraint(geminiApiKeySchema),
		shouldValidate: "onBlur",
		shouldRevalidate: "onInput",
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: geminiApiKeySchema });
		},
	});

	useEffect(() => {
		if (actionData?.success) {
			onOpenChange(false);
		}
	}, [actionData, onOpenChange]);

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="text-center">Set Gemini API Key</DialogTitle>
				</DialogHeader>
				<div className="text-center mb-4">
					<Link
						to="https://aistudio.google.com/app/apikey"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-2 transition-colors underline hover:text-blue-500"
					>
						<Button
							variant="default"
							size="sm"
							className="gap-2 shadow-md hover:shadow-lg transition-shadow"
						>
							<span className="">Get API Key at Google AI Studio</span>
							<Key className="w-4 h-4" />
							<ExternalLink className="w-4 h-4" />
						</Button>
					</Link>
				</div>
				<fetcher.Form
					method="post"
					action="/resources/gemini-api-key-dialog"
					{...getFormProps(form)}
				>
					<div className="flex items-center space-x-2">
						<Input
							{...getInputProps(geminiApiKey, {
								type: "password",
								required: true,
							})}
							className="flex-grow"
							placeholder="Enter your Gemini API Key"
						/>
						<Button type="submit" disabled={fetcher.state === "submitting"}>
							{fetcher.state === "submitting" ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : (
								<ArrowDownToLine className="w-4 h-4" />
							)}
						</Button>
					</div>
					<div
						id={geminiApiKey.errorId}
						className="text-red-500 text-center mt-2"
					>
						{geminiApiKey.errors}
					</div>
					{form.errors && (
						<p className="text-red-500 text-center mt-2">{form.errors}</p>
					)}
				</fetcher.Form>
			</DialogContent>
		</Dialog>
	);
}

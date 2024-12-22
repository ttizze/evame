import {
	getFormProps,
	getInputProps,
	getTextareaProps,
	useForm,
	useInputControl,
} from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, Link, useNavigation } from "@remix-run/react";
import type { MetaFunction } from "@remix-run/react";
import { useActionData, useLoaderData } from "@remix-run/react";
import { ExternalLink, Loader2, SaveIcon } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { validateGeminiApiKey } from "~/features/translate/services/gemini";
import { uploadImage } from "~/routes/$locale+/user.$userName+/utils/uploadImage";
import { authenticator } from "~/utils/auth.server";
import { cn } from "~/utils/cn";
import { sanitizeUser } from "~/utils/sanitizeUser";
import { commitSession, getSession } from "~/utils/session.server";
import { updateUser } from "./functions/mutations.server";
import { getUserByUserName } from "./functions/queries.server";
import reservedUsernames from "./reserved-usernames.json";

export const meta: MetaFunction = () => {
	return [{ title: "Edit Profile" }];
};

const RESERVED_USERNAMES = [...new Set([...reservedUsernames])];
const schema = z.object({
	displayName: z
		.string()
		.min(1, "Display name is required")
		.max(25, "Too Long. Must be 25 characters or less"),
	userName: z
		.string()
		.min(3, "Too Short. Must be at least 3 characters")
		.max(25, "Too Long. Must be 25 characters or less")
		.regex(
			/^[a-zA-Z][a-zA-Z0-9-]*$/,
			"Must start with a alphabet and can only contain alphabets, numbers, and hyphens",
		)
		.refine((name) => {
			const isReserved = RESERVED_USERNAMES.some(
				(reserved) => reserved.toLowerCase() === name.toLowerCase(),
			);
			return !isReserved;
		}, "This username cannot be used")
		.refine(
			(name) => !/^\d+$/.test(name),
			"Username cannot consist of only numbers",
		),
	profile: z
		.string()
		.max(200, "Too Long. Must be 200 characters or less")
		.optional(),
	icon: z.string(),
	geminiApiKey: z.string().optional(),
});

export async function loader({ params, request }: LoaderFunctionArgs) {
	const currentUser = await authenticator.isAuthenticated(request, {
		failureRedirect: "/login",
	});
	if (currentUser.userName !== params.userName) {
		throw new Response("Unauthorized", { status: 403 });
	}
	const updatedUser = await getUserByUserName(currentUser.userName);
	if (!updatedUser) {
		throw new Response("Not Found", { status: 404 });
	}
	return { currentUser: updatedUser };
}

export async function action({ request }: ActionFunctionArgs) {
	const currentUser = await authenticator.isAuthenticated(request, {
		failureRedirect: "/login",
	});
	const submission = parseWithZod(await request.formData(), { schema });
	if (submission.status !== "success") {
		return submission.reply();
	}

	const { displayName, userName, profile, icon, geminiApiKey } =
		submission.value;

	if (geminiApiKey && geminiApiKey.trim() !== "") {
		const { isValid, errorMessage } = await validateGeminiApiKey(geminiApiKey);

		if (!isValid) {
			return submission.reply({
				formErrors: [errorMessage || "Gemini API key validation failed"],
			});
		}
	}
	try {
		const updatedUser = await updateUser(currentUser.id, {
			displayName,
			userName,
			profile,
			icon,
			geminiApiKey,
		});
		const session = await getSession(request.headers.get("Cookie"));
		session.set("user", sanitizeUser(updatedUser));
		const headers = new Headers({
			"Set-Cookie": await commitSession(session),
		});
		return redirect(`/${updatedUser.userName}/edit`, { headers });
	} catch (error) {
		return submission.reply({
			formErrors: [error instanceof Error ? error.message : "Unknown error"],
		});
	}
}

export default function EditProfile() {
	const { currentUser } = useLoaderData<typeof loader>();
	const lastResult = useActionData<typeof action>();
	const navigation = useNavigation();
	const [showUsernameInput, setShowUsernameInput] = useState(false);
	const [form, fields] = useForm({
		id: "edit-profile-form",
		lastResult,
		constraint: getZodConstraint(schema),
		shouldValidate: "onBlur",
		shouldRevalidate: "onInput",
		defaultValue: {
			displayName: currentUser.displayName,
			userName: currentUser.userName,
			profile: currentUser.profile,
			icon: currentUser.icon,
		},
		onValidate({ formData }) {
			return parseWithZod(formData, { schema });
		},
	});

	const imageForm = useInputControl(fields.icon);
	const [profileIconUrl, setProfileIconUrl] = useState<string>(
		currentUser.icon,
	);

	const handleProfileImageUpload = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		if (file) {
			const url = await uploadImage(file);
			if (url) {
				imageForm.change(url);
				setProfileIconUrl(url);
			}
		}
	};

	const toggleUsernameInput = () => {
		setShowUsernameInput(!showUsernameInput);
	};

	return (
		<div className="container mx-auto">
			<div className="rounded-xl border p-4 ">
				<Form method="post" {...getFormProps(form)} className="space-y-4">
					<div>
						<img
							src={profileIconUrl}
							alt="Preview"
							className="mt-2 w-40 h-40 object-cover rounded-full"
						/>
						<div className="mt-3">
							<Label>Icon</Label>
						</div>
						<Input
							id={fields.icon.id}
							type="file"
							accept="image/*"
							onChange={handleProfileImageUpload}
							className="mt-3 bg-white dark:bg-black/50 cursor-pointer"
						/>
						<div id={fields.icon.errorId} className="text-red-500 text-sm mt-1">
							{fields.icon.errors}
						</div>
					</div>
					<div>
						<Label>User Name</Label>
					</div>
					<div>
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<span className="text-sm">Current URL:</span>
								<code className="px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded-lg">
									evame.tech/{currentUser.userName}
								</code>
							</div>
							<div className="space-y-1 text-sm text-amber-500">
								<p>⚠️ Important: Changing your username will:</p>
								<ul className="list-disc list-inside pl-4 space-y-1">
									<li>Update all URLs of your page</li>
									<li>Break existing links to your page</li>
									<li>Allow your current username to be claimed by others</li>
								</ul>
							</div>
							<Button
								type="button"
								variant="outline"
								onClick={toggleUsernameInput}
							>
								{showUsernameInput ? "Cancel" : "Edit Username"}
							</Button>
						</div>

						<code
							className={cn(
								"flex items-center gap-2 px-2 mt-2 py-1 bg-gray-200 dark:bg-gray-800 rounded-lg",
								showUsernameInput ? "block" : "hidden",
							)}
						>
							evame.tech/
							<Input
								{...getInputProps(fields.userName, { type: "text" })}
								className=" border rounded-lg bg-white dark:bg-black/50 focus:outline-none"
							/>
						</code>
						<div
							id={fields.userName.errorId}
							className="text-red-500 text-sm mt-1"
						>
							{fields.userName.errors}
						</div>
					</div>
					<div>
						<Label>Display Name</Label>
					</div>
					<div>
						<Input
							{...getInputProps(fields.displayName, { type: "text" })}
							className="w-full h-10 px-3 py-2 border rounded-lg  bg-white dark:bg-black/50 focus:outline-none"
						/>
						<div
							id={fields.displayName.errorId}
							className="text-red-500 text-sm mt-1"
						>
							{fields.displayName.errors}
						</div>
					</div>
					<div>
						<Label>Profile</Label>
					</div>
					<div>
						<textarea
							{...getTextareaProps(fields.profile)}
							className="w-full h-32 px-3 py-2  border rounded-lg  bg-white dark:bg-black/50 focus:outline-none"
						/>
						<div
							id={fields.profile.errorId}
							className="text-red-500 text-sm mt-1"
						>
							{fields.profile.errors}
						</div>
					</div>
					<div className="flex items-center justify-between">
						<Label>Gemini API Key</Label>
					</div>
					<div>
						<Link
							to="https://aistudio.google.com/app/apikey"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2 transition-colors underline hover:text-blue-500"
						>
							<span className="">Get API Key at Google AI Studio</span>
							<ExternalLink className="w-4 h-4" />
						</Link>
					</div>
					<div>
						<Input
							{...getInputProps(fields.geminiApiKey, { type: "password" })}
							className="w-full h-10 px-3 py-2 border rounded-lg  bg-white dark:bg-black/50 focus:outline-none"
						/>
					</div>
					<div
						id={fields.geminiApiKey.errorId}
						className="text-red-500 text-sm mt-1"
					>
						{fields.geminiApiKey.errors}
					</div>

					<Button
						type="submit"
						className="w-full h-10"
						disabled={navigation.state === "submitting"}
					>
						{navigation.state === "submitting" ? (
							<Loader2 className="w-6 h-6 animate-spin" />
						) : (
							<span className="flex items-center gap-2">
								<SaveIcon className="w-6 h-6" />
								Save
							</span>
						)}
					</Button>
					{form.allErrors && (
						<p className="text-red-500 text-center mt-2">
							{Object.values(form.allErrors).join(", ")}
						</p>
					)}
				</Form>
			</div>
		</div>
	);
}

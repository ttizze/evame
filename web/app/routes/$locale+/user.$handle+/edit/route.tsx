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
import { uploadImage } from "~/routes/$locale+/user.$handle+/utils/uploadImage";
import { GeminiApiKeyDialog } from "~/routes/resources+/gemini-api-key-dialog";
import { authenticator } from "~/utils/auth.server";
import { cn } from "~/utils/cn";
import { commitSession, getSession } from "~/utils/session.server";
import { updateUser } from "./functions/mutations.server";
import { getUserByHandle } from "./functions/queries.server";
import reservedHandles from "./reserved-handles.json";

export const meta: MetaFunction = () => {
	return [{ title: "Edit Profile" }];
};

const RESERVED_HANDLES = [...new Set([...reservedHandles])];
const schema = z.object({
	displayName: z
		.string()
		.min(1, "Display name is required")
		.max(25, "Too Long. Must be 25 characters or less"),
	handle: z
		.string()
		.min(3, "Too Short. Must be at least 3 characters")
		.max(25, "Too Long. Must be 25 characters or less")
		.regex(
			/^[a-zA-Z][a-zA-Z0-9-]*$/,
			"Must start with a alphabet and can only contain alphabets, numbers, and hyphens",
		)
		.refine((name) => {
			const isReserved = RESERVED_HANDLES.some(
				(reserved) => reserved.toLowerCase() === name.toLowerCase(),
			);
			return !isReserved;
		}, "This handle cannot be used")
		.refine(
			(name) => !/^\d+$/.test(name),
			"handle cannot consist of only numbers",
		),
	profile: z
		.string()
		.max(200, "Too Long. Must be 200 characters or less")
		.optional(),
	icon: z.string(),
});

export async function loader({ params, request }: LoaderFunctionArgs) {
	const currentUser = await authenticator.isAuthenticated(request, {
		failureRedirect: "/auth/login",
	});
	if (currentUser.handle !== params.handle) {
		throw new Response("Unauthorized", { status: 403 });
	}
	const updatedUser = await getUserByHandle(currentUser.handle);
	if (!updatedUser) {
		throw new Response("Not Found", { status: 404 });
	}
	return { currentUser: updatedUser };
}

export async function action({ request }: ActionFunctionArgs) {
	const currentUser = await authenticator.isAuthenticated(request, {
		failureRedirect: "/auth/login",
	});
	const submission = parseWithZod(await request.formData(), { schema });
	if (submission.status !== "success") {
		return submission.reply();
	}

	const { displayName, handle, profile, icon } = submission.value;

	try {
		const updatedUser = await updateUser(currentUser.id, {
			displayName,
			handle,
			profile,
			icon,
		});
		const session = await getSession(request.headers.get("Cookie"));
		session.set("user", updatedUser);
		const headers = new Headers({
			"Set-Cookie": await commitSession(session),
		});
		return redirect(`/user/${updatedUser.handle}/edit`, { headers });
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
	const [showHandleInput, setShowHandleInput] = useState(false);
	const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);

	const [form, fields] = useForm({
		id: "edit-profile-form",
		lastResult,
		constraint: getZodConstraint(schema),
		shouldValidate: "onBlur",
		shouldRevalidate: "onInput",
		defaultValue: {
			displayName: currentUser.displayName,
			handle: currentUser.handle,
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

	const toggleHandleInput = () => {
		setShowHandleInput(!showHandleInput);
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
									evame.tech/user/{currentUser.handle}
								</code>
							</div>
							<div className="space-y-1 text-sm text-amber-500">
								<p>⚠️ Important: Changing your handle will:</p>
								<ul className="list-disc list-inside pl-4 space-y-1">
									<li>Update all URLs of your page</li>
									<li>Break existing links to your page</li>
									<li>Allow your current handle to be claimed by others</li>
								</ul>
							</div>
							<Button
								type="button"
								variant="outline"
								onClick={toggleHandleInput}
							>
								{showHandleInput ? "Cancel" : "Edit Handle"}
							</Button>
						</div>

						<code
							className={cn(
								"flex items-center gap-2 px-2 mt-2 py-1 bg-gray-200 dark:bg-gray-800 rounded-lg",
								showHandleInput ? "block" : "hidden",
							)}
						>
							evame.tech/
							<Input
								{...getInputProps(fields.handle, { type: "text" })}
								className=" border rounded-lg bg-white dark:bg-black/50 focus:outline-none"
							/>
						</code>
						<div
							id={fields.handle.errorId}
							className="text-red-500 text-sm mt-1"
						>
							{fields.handle.errors}
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
					<Button
						type="button"
						onClick={() => setIsApiKeyDialogOpen(true)}
						className="w-full"
					>
						Set API Key
					</Button>
					<div>
						<GeminiApiKeyDialog
							isOpen={isApiKeyDialogOpen}
							onOpenChange={setIsApiKeyDialogOpen}
						/>
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

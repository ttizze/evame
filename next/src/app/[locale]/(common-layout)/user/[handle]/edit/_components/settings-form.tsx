"use client";

import { GeminiApiKeyDialog } from "@/app/[locale]/_components/gemini-api-key-dialog/gemini-api-key-dialog";
import type { SanitizedUser } from "@/app/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Loader2, SaveIcon } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { type UserEditState, userEditAction } from "./user-edit-action";

interface SettingsFormProps {
	currentUser: SanitizedUser;
}

export function SettingsForm({ currentUser }: SettingsFormProps) {
	const [showHandleInput, setShowHandleInput] = useState(false);
	const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);

	const [editState, editAction, isEditPending] = useActionState<
		UserEditState,
		FormData
	>(userEditAction, {
		success: true,
		data: {
			name: currentUser.name,
		},
	});

	useEffect(() => {
		if (editState.success && editState.message) {
			toast.success(editState.message);
		} else if (
			!editState.success &&
			editState.message &&
			!editState.zodErrors
		) {
			toast.error(editState.message);
		}
	}, [editState]);

	return (
		<form action={editAction} className="space-y-4">
			<input type="hidden" name="name" value={currentUser.name} />
			{currentUser.profile && (
				<input type="hidden" name="profile" value={currentUser.profile} />
			)}
			{currentUser.twitterHandle && (
				<input
					type="hidden"
					name="twitterHandle"
					value={currentUser.twitterHandle}
				/>
			)}

			<div>
				<Label>User Name</Label>
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
						onClick={() => setShowHandleInput(!showHandleInput)}
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
					evame.tech/user/
					<Input
						defaultValue={currentUser.handle}
						name="handle"
						minLength={3}
						maxLength={25}
						required
						className="border rounded-lg bg-white dark:bg-black/50 focus:outline-hidden"
					/>
				</code>
				{!editState.success && editState.zodErrors?.handle && (
					<div className="text-red-500 text-sm mt-1">
						{editState.zodErrors.handle}
					</div>
				)}
			</div>

			<Label>Gemini API Key</Label>
			<Button
				type="button"
				onClick={() => setIsApiKeyDialogOpen(true)}
				className="w-full"
				variant="outline"
			>
				Set API Key
			</Button>
			<GeminiApiKeyDialog
				isOpen={isApiKeyDialogOpen}
				onOpenChange={setIsApiKeyDialogOpen}
			/>

			<Button type="submit" className="w-full h-10" disabled={isEditPending}>
				{isEditPending ? (
					<Loader2 className="w-6 h-6 animate-spin" />
				) : (
					<span className="flex items-center gap-2">
						<SaveIcon className="w-6 h-6" />
						Save
					</span>
				)}
			</Button>
		</form>
	);
}
